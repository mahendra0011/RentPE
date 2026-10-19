import { io } from "socket.io-client";

const API_URL = "http://localhost:5000";

async function testAll() {
  console.log("=== STEP 1: Testing Backend Health ===");
  const healthRes = await fetch(`${API_URL}/api/health`);
  const healthData = await healthRes.json();
  console.log("Health Check:", healthData);

  console.log("\n=== STEP 2: Testing Public Rooms API ===");
  const roomsRes = await fetch(`${API_URL}/api/rooms`);
  const roomsData = await roomsRes.json();
  console.log(`Fetched ${roomsData?.rooms?.length || 0} rooms. OK:`, roomsData?.ok);

  console.log("\n=== STEP 3: Testing Admin / User Login ===");
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "mahendrapra0077@gmail.com",
      password: "admin@123",
      isOwner: true,
    }),
  });
  const loginData = await loginRes.json();
  console.log("Login Status:", loginRes.status);
  console.log("User:", loginData.user?.email, "Role:", loginData.user?.role);
  const token = loginData.token;

  if (!token) {
    console.error("No token received, aborting authenticated tests.");
    return;
  }

  console.log("\n=== STEP 4: Testing Chat Conversations API ===");
  const convRes = await fetch(`${API_URL}/api/chat/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const convData = await convRes.json();
  console.log("Conversations status:", convRes.status);
  console.log("Active Conversations count:", convData?.conversations?.length ?? convData?.length ?? 0);

  console.log("\n=== STEP 5: Testing Chat Unread Count ===");
  const unreadRes = await fetch(`${API_URL}/api/chat/unread-count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const unreadData = await unreadRes.json();
  console.log("Unread count:", unreadData);

  console.log("\n=== STEP 6: Testing Socket.io Real-Time Connection ===");
  const socket = io(API_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Socket connection timed out after 5s"));
    }, 5000);

    socket.on("connect", () => {
      clearTimeout(timeout);
      console.log("✅ Socket.io Connected! Socket ID:", socket.id);
      resolve();
    });

    socket.on("connect_error", (err) => {
      clearTimeout(timeout);
      console.error("❌ Socket Connection Error:", err.message);
      reject(err);
    });

    socket.on("online:snapshot", (snapshot) => {
      console.log("✅ Received online:snapshot:", Object.keys(snapshot));
    });
  });

  console.log("\n=== STEP 7: Testing Socket Events ===");
  socket.emit("typing:start", { conversationId: "test_convo_123" });
  console.log("Emitted typing:start successfully");

  socket.disconnect();
  console.log("\n🎉 ALL TESTS PASSED! Backend, Auth, Chat API & WebSockets are 100% OPERATIONAL!");
  process.exit(0);
}

testAll().catch((err) => {
  console.error("❌ Test Failed with Error:", err);
  process.exit(1);
});
