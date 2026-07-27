# CoEdit

> **A real-time collaborative text editor powered by a character-level CRDT, enabling conflict-free synchronization, offline-safe editing, and seamless collaboration.**

<p align="center">
  <a href="https://coedit-client.onrender.com"><strong>🌐 Live Demo</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?logo=react" />
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js" />
  <img src="https://img.shields.io/badge/Socket.IO-Realtime-010101?logo=socket.io" />
  <img src="https://img.shields.io/badge/CRDT-Conflict--Free-success" />
</p>

> **Note**
>
> This demo is hosted on **Render's free tier**. The first request after a period of inactivity may take **30–60 seconds** while the backend services wake up.

---

# Overview

CoEdit is a real-time collaborative text editor that allows multiple users to edit the same document simultaneously while guaranteeing every participant converges to the **exact same final document**.

Unlike traditional collaborative editors that rely on a central server to resolve conflicting edits, CoEdit uses a **character-level Conflict-free Replicated Data Type (CRDT)**. Every client independently computes the final document, while the server simply relays operations between connected users.

The result is a collaborative editor that supports:

- Real-time collaboration
- Conflict-free synchronization
- Offline-safe editing
- Live user presence
- Deterministic convergence across every connected client

---

# Demo Modes

## 🎬 Watch It Work

A built-in two-user simulation that demonstrates concurrent editing, animated playback, and automatic verification.

No second user is required.

## 🤝 Start a Real Session

Create a shareable room link and collaborate with another user in real time across different browsers or devices.

---

# Features

## 🚀 Real-Time Collaboration

- Real-time synchronized editing using Socket.IO
- Shareable collaboration rooms
- Live typing indicators
- Per-user text color highlighting
- Active participant list
- Automatic disconnect detection

## ⚡ Conflict-Free Synchronization

- Character-level CRDT implementation
- Fractional-position indexing
- Deterministic ordering of simultaneous edits
- Tombstone-based deletion
- Automatic conflict resolution
- Eventual consistency across all clients

## 🛡 Reliability

- Offline-safe editing
- Automatic merge after reconnect
- Stateless synchronization server
- No central conflict resolver
- Consistent document convergence

## 🛠 Developer Tools

- Built-in concurrent editing simulator
- Animated operation playback
- Pass/Fail verification
- CRDT Inspector
- Raw CRDT visualization

---

# Engineering Highlights

- Built a **character-level CRDT** from scratch
- Implemented **fractional-position indexing** for infinite insertions without reindexing existing characters
- Used **tombstone deletes** instead of hard deletion for safe concurrent operations
- Designed a **stateless Socket.IO relay server**
- Guaranteed deterministic document convergence regardless of edit order
- Supported temporary offline editing with automatic synchronization after reconnect

---

# How It Works

Each character inside the document is represented as an independent CRDT entry.

```javascript
{
  id,
  position,
  char,
  author,
  deleted
}
```

### Position

Each character receives a fractional position value.

Example:

```
A (1)
B (2)

Insert X

↓

A (1)
X (1.5)
B (2)
```

This allows inserting characters between any two existing characters without shifting or renumbering the document.

---

### Tombstones

Characters are never permanently removed.

Instead, they become:

```javascript
deleted: true
```

The character is hidden from the document but still exists internally, allowing concurrent operations that reference it to be processed safely.

---

### Conflict Resolution

When multiple users insert characters at the same logical position:

- Every client receives the same operations
- Entries are deterministically ordered
- Every participant independently reaches the exact same final document

No server decides which edit wins.

---

# Why CRDT Instead of Operational Transformation?

Many collaborative editors use **Operational Transformation (OT)**, where the server transforms conflicting operations before broadcasting them.

CoEdit instead uses a **Conflict-free Replicated Data Type (CRDT)**.

### Advantages

- No server-side conflict resolution
- Offline editing support
- Automatic synchronization after reconnect
- Deterministic convergence
- Simpler backend architecture
- Better resilience to network interruptions

---

# Architecture

```
                   Operations
        ┌────────────────────────────┐

┌──────────────┐              ┌──────────────┐
│   Client A   │◄───────────► │              │
│ Local CRDT   │              │              │
└──────────────┘              │              │
                              │  Socket.IO   │
                              │ Relay Server │
┌──────────────┐              │  Stateless   │
│   Client B   │◄───────────► │              │
│ Local CRDT   │              │              │
└──────────────┘              └──────────────┘

      Every client performs conflict
      resolution independently.
```

The server is responsible for:

- Relaying operations
- Managing collaboration rooms
- Broadcasting presence events

The server **never stores document state** and **never performs conflict resolution**.

---

# Tech Stack

| Layer | Technology |
|--------|------------|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Real-time Communication | Socket.IO |
| Synchronization | Character-Level CRDT |
| Deployment | Render |

---

# Project Structure

```
CoEdit-A-Shared-Text-editor/

├── client/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/
│   ├── socket/
│   ├── routes/
│   ├── package.json
│   └── server.js
│
└── README.md
```

---

# Getting Started

Clone the repository.

```bash
git clone https://github.com/Yanvi09/CoEdit-A-Shared-Text-editor.git

cd CoEdit-A-Shared-Text-editor
```

### Install Server

```bash
cd server

npm install

npm start
```

### Install Client

```bash
cd client

npm install

npm run dev
```

Open the Vite development server.

```
http://localhost:5173
```

---

# Socket Events

| Event | Direction | Purpose |
|--------|-----------|----------|
| operation | Client ⇄ Server ⇄ Client | Synchronize CRDT operations |
| typing | Client ⇄ Server ⇄ Client | Live typing indicator |
| room-participants | Server → Client | Update active participants |
| user-disconnected | Server → Client | Notify when a participant leaves |

---

# Design Decisions

## Why Character-Level CRDT?

Character-level granularity eliminates ambiguity when multiple users edit inside the same word simultaneously.

---

## Why Fractional Positions?

Fractional indexing enables unlimited insertions between characters without reindexing the document.

---

## Why Tombstones?

Tombstones allow delete operations to remain safe even if concurrent operations still reference deleted characters.

---

## Why a Stateless Server?

Keeping merge logic entirely on the clients enables:

- Offline editing
- Simpler backend architecture
- Deterministic synchronization
- No centralized conflict resolver

**Trade-off:** If every participant disconnects, the current document is lost because persistence has not yet been implemented.

---

# What I Learned

Building CoEdit gave me practical experience with distributed systems concepts that are difficult to appreciate through theory alone.

Implementing a character-level CRDT helped me understand how collaborative systems achieve **eventual consistency** without relying on a central authority to resolve conflicts.

Some of the biggest takeaways from this project include:

- Designing deterministic merge algorithms
- Implementing fractional-position indexing
- Using tombstones for safe delete operations
- Building real-time synchronization with Socket.IO
- Designing a stateless architecture
- Thinking about distributed systems trade-offs instead of only application features

---

# Future Improvements

- Persistent document storage
- Authentication and authorization
- Live cursor synchronization
- Rich text editing
- Multi-document workspaces
- Improved scalability for large documents
- Rate limiting
- Structured logging and monitoring
- Load testing with many concurrent collaborators

---

# Let's Connect

If you have feedback, suggestions, or think I'd be a good fit for your team, I'd love to connect.

📧 **Email:** **yadavanvi355@gmail.com**

💼 **LinkedIn:** https://www.linkedin.com/in/anvi-yadav/

I'm always happy to discuss backend engineering, distributed systems, collaborative applications, and interesting product ideas.

---

⭐ If you found this project interesting, consider giving it a **star** on GitHub—it helps others discover the project and motivates future improvements.
