import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import {
  initializeApp,
  applicationDefault,
  getApps
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleAuth } from "google-auth-library";

const PROJECT_ID = "ai-interview-coach-final";
const LOCATION = "us-central1";
const MODEL = "gemini-2.5-flash";
const PORT = process.env.PORT || 8080;

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID
  });
}

const db = getFirestore();
const firebaseAuth = getAuth();

const googleAuth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"]
});

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    app: "AI Interview Coach Final",
    model: MODEL
  });
});

app.get("/api/config", (req, res) => {
  if (!process.env.FIREBASE_WEB_API_KEY) {
    return res.status(500).json({
      error: "Firebase configuration is unavailable."
    });
  }

  res.json({
    apiKey: process.env.FIREBASE_WEB_API_KEY,
    authDomain: "ai-interview-coach-final.firebaseapp.com",
    projectId: "ai-interview-coach-final",
    storageBucket: "ai-interview-coach-final.firebasestorage.app",
    messagingSenderId: "782933997269",
    appId: "1:782933997269:web:ba3eea931f1cac0f87945c"
  });
});

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const token = header.substring(7);
    req.user = await firebaseAuth.verifyIdToken(token);
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    res.status(401).json({ error: "Invalid or expired session." });
  }
}

function formatTime(value) {
  try {
    return value?.toDate?.().toISOString() || null;
  } catch {
    return null;
  }
}

app.get("/api/chats", requireAuth, async (req, res) => {
  try {
    const snap = await db
      .collection("users")
      .doc(req.user.uid)
      .collection("chats")
      .orderBy("updatedAt", "desc")
      .limit(30)
      .get();

    const chats = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: formatTime(doc.data().createdAt),
      updatedAt: formatTime(doc.data().updatedAt)
    }));

    res.json({ chats });
  } catch (error) {
    console.error("List chats error:", error);
    res.status(500).json({ error: "Unable to load interviews." });
  }
});

app.post("/api/chats", requireAuth, async (req, res) => {
  try {
    const topic = String(req.body.topic || "Performance Marketing").trim();

    const chatRef = db
      .collection("users")
      .doc(req.user.uid)
      .collection("chats")
      .doc();

    const welcome =
      `Welcome to your ${topic} interview. ` +
      `Type "Start interview" when you're ready.`;

    const batch = db.batch();

    batch.set(chatRef, {
      topic,
      title: `${topic} Interview`,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    const messageRef = chatRef.collection("messages").doc();

    batch.set(messageRef, {
      role: "assistant",
      text: welcome,
      createdAt: FieldValue.serverTimestamp()
    });

    await batch.commit();

    res.status(201).json({
      id: chatRef.id,
      topic,
      title: `${topic} Interview`
    });
  } catch (error) {
    console.error("Create chat error:", error);
    res.status(500).json({ error: "Unable to create interview." });
  }
});

app.get("/api/chats/:chatId/messages", requireAuth, async (req, res) => {
  try {
    const chatRef = db
      .collection("users")
      .doc(req.user.uid)
      .collection("chats")
      .doc(req.params.chatId);

    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
      return res.status(404).json({ error: "Interview not found." });
    }

    const snap = await chatRef
      .collection("messages")
      .orderBy("createdAt", "asc")
      .limit(100)
      .get();

    const messages = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: formatTime(doc.data().createdAt)
    }));

    res.json({
      chat: {
        id: chatDoc.id,
        ...chatDoc.data()
      },
      messages
    });
  } catch (error) {
    console.error("Messages error:", error);
    res.status(500).json({ error: "Unable to load messages." });
  }
});

async function askGemini(topic, history) {
  const accessToken = await googleAuth.getAccessToken();

  if (!accessToken) {
    throw new Error("Unable to obtain Vertex AI access token.");
  }

  const vertexContents = history
    .filter(message => message.role === "user" || message.role === "assistant")
    .map(message => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.text }]
    }));

 const systemPrompt = `
You are an expert AI Interview Coach conducting a realistic interview for:
"${topic}".

STRICT INTERVIEW FLOW:

1. Ask exactly ONE interview question at a time.

2. When the candidate says "Start interview":
   - Begin immediately with Question 1.
   - Do not evaluate "Start interview".

3. When the candidate gives a genuine answer:
   Respond in this exact structure:

   Score: X/10

   Strength:
   One concise strength.

   Improvement:
   One concise improvement.

   Better Answer:
   Give a short improved example only when useful.

   Next Question:
   Question X: [next interview question]

4. ALWAYS include the next question at the END of the response after evaluating
   a genuine answer.

5. Keep the total evaluation concise so the next question is never omitted.

6. If the candidate types:
   "next question"
   "skip"
   "skip question"

   then mark the current question as skipped and immediately ask the next question.
   Do not give a score for a skipped question.

7. Never repeat the same question unless the candidate specifically asks you to repeat it.

8. Progress through:
   Basic → Intermediate → Advanced → Scenario-based questions.

9. Maintain question numbering throughout the interview.

10. For Performance Marketing topics, include practical questions covering:
    Google Ads, Meta Ads, GA4, GTM, conversion tracking, bidding,
    attribution, optimization, lead quality and campaign strategy.

11. Never end an evaluation without either:
    - asking the next question, or
    - clearly stating that the interview is complete.

12. Keep each response concise and interview-focused.
`;

  const response = await fetch(
    `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: vertexContents,
        generationConfig: {
          temperature: 0.45,
          maxOutputTokens: 1000
        }
      })
    }
  );

  const raw = await response.text();

  if (!response.ok) {
    console.error("Vertex AI HTTP error:", response.status, raw);
    throw new Error(`Vertex AI request failed (${response.status}).`);
  }

  const data = JSON.parse(raw);

  const text = data.candidates?.[0]?.content?.parts
    ?.map(part => part.text || "")
    .join("")
    .trim();

  if (!text) {
    console.error("Unexpected Vertex response:", raw);
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

app.post("/api/chats/:chatId/message", requireAuth, async (req, res) => {
  try {
    const text = String(req.body.text || "").trim();

    if (!text) {
      return res.status(400).json({ error: "Please enter an answer." });
    }

    if (text.length > 6000) {
      return res.status(400).json({ error: "Message is too long." });
    }

    const chatRef = db
      .collection("users")
      .doc(req.user.uid)
      .collection("chats")
      .doc(req.params.chatId);

    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
      return res.status(404).json({ error: "Interview not found." });
    }

    await chatRef.collection("messages").add({
      role: "user",
      text,
      createdAt: FieldValue.serverTimestamp()
    });

    await chatRef.update({
      updatedAt: FieldValue.serverTimestamp()
    });

    const historySnap = await chatRef
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const history = historySnap.docs
      .map(doc => doc.data())
      .reverse();

    const answer = await askGemini(chatDoc.data().topic, history);

    const answerRef = await chatRef.collection("messages").add({
      role: "assistant",
      text: answer,
      createdAt: FieldValue.serverTimestamp()
    });

    await chatRef.update({
      updatedAt: FieldValue.serverTimestamp()
    });

    res.json({
      message: {
        id: answerRef.id,
        role: "assistant",
        text: answer
      }
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: "AI Coach could not respond. Please try again."
    });
  }
});

app.get("*path", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Interview Coach running on port ${PORT}`);
});
