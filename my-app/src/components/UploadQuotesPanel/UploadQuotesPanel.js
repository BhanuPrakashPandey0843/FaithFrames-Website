"use client";
import React, { useState, useEffect } from "react";
import Sidebar from "../Sidebar/Sidebar";
import { db } from "../../firebase"; 
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function UploadQuotesPanel() {
  const [quote, setQuote] = useState("");
  const [quotes, setQuotes] = useState([]);
  const [editId, setEditId] = useState(null);

  // 🔹 Fetch quotes in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "quotes"), (snapshot) => {
      setQuotes(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });
    return () => unsub();
  }, []);

  // 🔹 Add or Update Quote
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quote.trim()) return;

    try {
      if (editId) {
        await updateDoc(doc(db, "quotes", editId), {
          text: quote,
        });
        setEditId(null);
      } else {
        await addDoc(collection(db, "quotes"), {
          text: quote,
          createdAt: serverTimestamp(),
        });
      }
      setQuote("");
    } catch (error) {
      console.error("Error saving quote: ", error);
    }
  };

  // 🔹 Delete Quote
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "quotes", id));
    } catch (error) {
      console.error("Error deleting quote: ", error);
    }
  };

  // 🔹 Edit Quote
  const handleEdit = (id, text) => {
    setEditId(id);
    setQuote(text);
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 ml-20 md:ml-64 p-6 md:p-10 transition-all duration-500">
        <h1 className="text-3xl font-bold mb-6 text-indigo-700">
           Upload Quotes Panel
        </h1>

        {/* Upload Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col md:flex-row gap-4 bg-white shadow-lg p-6 rounded-xl border mb-8"
        >
          <input
            type="text"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder="✨ Write an inspiring one-liner..."
            className="flex-1 border border-gray-300 rounded-lg p-3 text-gray-900 placeholder-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className={`${
              editId
                ? "bg-green-600 hover:bg-green-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            } text-white px-6 py-3 rounded-lg font-semibold shadow-md transition`}
          >
            {editId ? "Update Quote" : "Upload Quote"}
          </button>
        </form>

        {/* Quotes List */}
        <div className="bg-white shadow-lg rounded-xl p-6 border">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
             All Uploaded Quotes
          </h2>
          {quotes.length === 0 ? (
            <p className="text-gray-500 italic">
              No quotes uploaded yet. Add your first one above 
            </p>
          ) : (
            <ul className="space-y-3">
              {quotes
                .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds) // newest first
                .map((q) => (
                  <li
                    key={q.id}
                    className={`flex justify-between items-center p-4 rounded-lg shadow-sm border ${
                      editId === q.id ? "bg-yellow-100 border-yellow-400" : "bg-gray-50"
                    }`}
                  >
                    <span className="text-gray-800 font-medium">{q.text}</span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEdit(q.id, q.text)}
                        className="px-3 py-1 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
