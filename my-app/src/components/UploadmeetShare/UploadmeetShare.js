"use client";
import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  updateDoc,
  increment,
} from "firebase/firestore";
import { app } from "../../firebase";

const db = getFirestore(app);

const UploadmeetShare = () => {
  const [form, setForm] = useState({
    message: "",
    meetLink: "",
  });
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔁 Real-time fetch with ordering
  useEffect(() => {
    const q = query(collection(db, "meetSessions"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSessions(data);
    });

    return () => unsub();
  }, []);

  // 🧠 Handle input changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ➕ Add new meet session
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.message || !form.meetLink) {
      alert("⚠️ Please fill all required fields");
      return;
    }
    try {
      setLoading(true);
      await addDoc(collection(db, "meetSessions"), {
        ...form,
        likes: 0,
        dislikes: 0,
        createdAt: serverTimestamp(),
      });
      alert("✅ Meet session added");
      setForm({ message: "", meetLink: "" });
    } catch (error) {
      console.error(error);
      alert("❌ Error adding session");
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ Delete session
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "meetSessions", id));
      alert("🗑️ Session deleted");
    } catch (error) {
      console.error(error);
      alert("❌ Error deleting session");
    }
  };

  // 👍 Like & 👎 Dislike functions
  const handleLike = async (id, type) => {
    try {
      const docRef = doc(db, "meetSessions", id);
      await updateDoc(docRef, {
        [type]: increment(1),
      });
    } catch (error) {
      console.error("Error updating likes/dislikes:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-indigo-800 text-center drop-shadow-sm">
          Admin Panel – Meet Share
        </h1>

        {/* 📝 Add Form */}
        <form
          onSubmit={handleAdd}
          className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 md:p-10 transition space-y-5 mb-12"
        >
          <div className="grid md:grid-cols-2 gap-6">
            <input
              type="text"
              name="message"
              placeholder="Enter meeting message"
              value={form.message}
              onChange={handleChange}
              className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-800 font-medium"
              required
            />
            <input
              type="url"
              name="meetLink"
              placeholder="Enter Google Meet link"
              value={form.meetLink}
              onChange={handleChange}
              className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-800 font-medium"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 font-semibold rounded-2xl transition text-lg ${
              loading
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
            }`}
          >
            {loading ? "Adding..." : "➕ Add Meet Session"}
          </button>
        </form>

        {/* 🧾 Meet Sessions List */}
        <div className="space-y-6">
          {sessions.length === 0 ? (
            <div className="text-center text-gray-600">
              <img
                src="https://cdn-icons-png.flaticon.com/512/4076/4076503.png"
                alt="empty"
                className="mx-auto w-32 mb-4 opacity-70"
              />
              <p>No meet sessions added yet.</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white p-6 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between hover:shadow-lg transition"
              >
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-bold text-gray-800">
                    {session.message}
                  </h2>
                  <a
                    href={session.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm underline break-words hover:text-blue-800"
                  >
                    {session.meetLink}
                  </a>
                  <p className="text-xs text-gray-500">
                    Created:{" "}
                    {session.createdAt
                      ? new Date(
                          session.createdAt.seconds * 1000
                        ).toLocaleString()
                      : "Just now"}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-700">
                    <button
                      onClick={() => handleLike(session.id, "likes")}
                      className="bg-green-100 hover:bg-green-200 px-3 py-1 rounded-lg"
                    >
                      👍 {session.likes || 0}
                    </button>
                    <button
                      onClick={() => handleLike(session.id, "dislikes")}
                      className="bg-red-100 hover:bg-red-200 px-3 py-1 rounded-lg"
                    >
                      👎 {session.dislikes || 0}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(session.id)}
                  className="mt-4 md:mt-0 bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadmeetShare;
