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
    if (
      item.role === "assistant" &&
      item.text.includes("Next Question:")
    ) {
      const parts = item.text.split("Next Question:");

      const feedbackText = parts[0].trim();
      const questionText = parts.slice(1).join("Next Question:").trim();

      if (feedbackText) {
        const feedbackRow = document.createElement("div");
        feedbackRow.className = "message-row assistant-row";

        feedbackRow.innerHTML = `
          <div class="message assistant">
            <span>AI Coach</span>
            <div>${escapeHTML(feedbackText).replace(/\n/g, "<br>")}</div>
          </div>
        `;

        messages.appendChild(feedbackRow);
      }

      if (questionText) {
        const questionRow = document.createElement("div");
        questionRow.className = "message-row assistant-row";

        questionRow.innerHTML = `
          <div class="message assistant next-question-card">
            <span>AI Coach</span>
            <div><strong>Next Question</strong><br>${escapeHTML(questionText).replace(/\n/g, "<br>")}</div>
          </div>
        `;

        messages.appendChild(questionRow);
      }

      continue;
    }

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

  requestAnimationFrame(() => {
    messages.scrollTo({
      top: messages.scrollHeight,
      behavior: "smooth"
    });
  });
}

async function loadChats() {
  const data = await api("/api/chats");
  chatList.innerHTML = "";

  if (!data.chats.length) {
    chatList.innerHTML = `<div class="no-chats">No interviews yet.</div>`;
    return;
  }

  data.chats.forEach(chat => {
   const wrapper = document.createElement("div");
wrapper.className = "chat-item-wrapper";

const button = document.createElement("button");
button.className = "chat-item";
button.textContent = chat.title;
button.onclick = () => {
  document.querySelectorAll(".chat-menu").forEach(menu => {
    menu.classList.add("hidden");
  });

  openChat(chat.id);
};

const menuWrap = document.createElement("div");
menuWrap.className = "chat-menu-wrap";

const menuBtn = document.createElement("button");
menuBtn.className = "chat-menu-btn";
menuBtn.textContent = "⋮";
menuBtn.title = "Manage interview";

const menu = document.createElement("div");
menu.className = "chat-menu hidden";

const openItem = document.createElement("button");
openItem.className = "chat-menu-item";
openItem.innerHTML = `<span>Open</span>`;

openItem.onclick = () => {
  menu.classList.add("hidden");
  openChat(chat.id);
};

const deleteItem = document.createElement("button");
deleteItem.className = "chat-menu-item danger";
deleteItem.innerHTML = `<span>Delete</span>`;

deleteItem.onclick = () => {
  menu.classList.add("hidden");
  showDeleteModal(chat);
};

menuBtn.onclick = event => {
  event.stopPropagation();

  document
    .querySelectorAll(".chat-menu")
    .forEach(m => {
      if (m !== menu) m.classList.add("hidden");
    });

  menu.classList.toggle("hidden");
};

menu.onclick = event => {
  event.stopPropagation();
};

menu.appendChild(openItem);
menu.appendChild(deleteItem);

menuWrap.appendChild(menuBtn);
menuWrap.appendChild(menu);

wrapper.appendChild(button);
wrapper.appendChild(menuWrap);

chatList.appendChild(wrapper);
  });
}
let deleteTargetChat = null;

function showDeleteModal(chat) {
  deleteTargetChat = chat;

  document.getElementById("deleteChatName").textContent = chat.title;

  document
    .getElementById("deleteModal")
    .classList.remove("hidden");
}

function hideDeleteModal() {
  deleteTargetChat = null;

  document
    .getElementById("deleteModal")
    .classList.add("hidden");
}

document.addEventListener("click", () => {
  document.querySelectorAll(".chat-menu").forEach(menu => {
    menu.classList.add("hidden");
  });
});


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

const originalButtonText = sendBtn.textContent;
sendBtn.textContent = "Thinking...";
messageInput.disabled = true;

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
    sendBtn.textContent = originalButtonText;
  messageInput.disabled = false;
  messageInput.focus();
  }
}

signInBtn.onclick = () => handleSignIn(false);
createBtn.onclick = () => handleSignIn(true);
newChatBtn.onclick = createInterview;
sendBtn.onclick = sendMessage;
signOutBtn.onclick = () => signOut(firebaseAuth);

document.getElementById("cancelDeleteBtn").onclick = hideDeleteModal;

document.getElementById("confirmDeleteBtn").onclick = async () => {
  if (!deleteTargetChat) return;

  try {
    const chatId = deleteTargetChat.id;

    await api(`/api/chats/${chatId}`, {
      method: "DELETE"
    });

    if (currentChatId === chatId) {
      currentChatId = null;
      messages.innerHTML = "";
      chatTitle.textContent = "AI Interview Coach";
    }

    hideDeleteModal();
    await loadChats();

  } catch (error) {
    alert(error.message);
  }
};

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
