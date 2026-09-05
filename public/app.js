import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

let firebaseAuth = null;
let currentChatId = null;

const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signInBtn = document.getElementById("signInBtn");
const createBtn = document.getElementById("createBtn");
const authError = document.getElementById("authError");
const topicSelect = document.getElementById("topic");
const newChatBtn = document.getElementById("newChatBtn");
const chatList = document.getElementById("chatList");
const chatTitle = document.getElementById("chatTitle");
const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const userEmail = document.getElementById("userEmail");
const signOutBtn = document.getElementById("signOutBtn");

function escapeHTML(value = "") {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

async function api(path, options = {}) {
  const user = firebaseAuth.currentUser;

  if (!user) {
    throw new Error("Please sign in again.");
  }

  const token = await user.getIdToken();

  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

async function handleSignIn(create = false) {
  authError.textContent = "";

  try {
    if (create) {
      await createUserWithEmailAndPassword(
        firebaseAuth,
        emailInput.value.trim(),
        passwordInput.value
      );
    } else {
      await signInWithEmailAndPassword(
        firebaseAuth,
        emailInput.value.trim(),
        passwordInput.value
      );
    }
  } catch (error) {
    authError.textContent = error.message;
  }
}

function renderMessages(items) {
  messages.innerHTML = "";

  for (const item of items) {
    const row = document.createElement("div");
    row.className =
      item.role === "user"
        ? "message-row user-row"
        : "message-row assistant-row";

    row.innerHTML = `
      <div class="message ${item.role}">
        <span>${item.role === "user" ? "You" : "AI Coach"}</span>
        <div>${escapeHTML(item.text).replace(/\n/g, "<br>")}</div>
      </div>
    `;

    messages.appendChild(row);
  }

  messages.scrollTop = messages.scrollHeight;
}

async function loadChats() {
  const data = await api("/api/chats");
  chatList.innerHTML = "";

  if (!data.chats.length) {
    chatList.innerHTML = `<div class="no-chats">No interviews yet.</div>`;
    return;
  }

  data.chats.forEach(chat => {
    const button = document.createElement("button");
    button.className = "chat-item";
    button.textContent = chat.title;
    button.onclick = () => openChat(chat.id);
    chatList.appendChild(button);
  });
}

async function openChat(id) {
  currentChatId = id;

  const data = await api(`/api/chats/${id}/messages`);

  chatTitle.textContent = data.chat.title;
  topicSelect.value = data.chat.topic;
  renderMessages(data.messages);
}

async function createInterview() {
  const data = await api("/api/chats", {
    method: "POST",
    body: JSON.stringify({ topic: topicSelect.value })
  });

  await loadChats();
  await openChat(data.id);
}

async function sendMessage() {
  const text = messageInput.value.trim();

  if (!currentChatId) {
    alert("Create a new interview first.");
    return;
  }

  if (!text) return;

  messageInput.value = "";
  sendBtn.disabled = true;

  try {
    await api(`/api/chats/${currentChatId}/message`, {
      method: "POST",
      body: JSON.stringify({ text })
    });

    await openChat(currentChatId);
  } catch (error) {
    alert(error.message);
  } finally {
    sendBtn.disabled = false;
  }
}

signInBtn.onclick = () => handleSignIn(false);
createBtn.onclick = () => handleSignIn(true);
newChatBtn.onclick = createInterview;
sendBtn.onclick = sendMessage;
signOutBtn.onclick = () => signOut(firebaseAuth);

messageInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

async function start() {
  const response = await fetch("/api/config");
  const config = await response.json();

  const firebaseApp = initializeApp(config);
  firebaseAuth = getAuth(firebaseApp);

  onAuthStateChanged(firebaseAuth, async user => {
document.body.classList.remove("auth-loading");
    if (user) {
      authView.classList.add("hidden");
      appView.classList.remove("hidden");
      userEmail.textContent = user.email || "Signed in";
      await loadChats();
    } else {
      appView.classList.add("hidden");
      authView.classList.remove("hidden");
      currentChatId = null;
    }
  });
}

start();
