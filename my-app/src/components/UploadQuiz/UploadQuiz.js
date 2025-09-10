"use client";
import React, { useState, useEffect } from "react";
import { db } from "@/firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

const UploadQuiz = () => {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    category: "",
    explanation: "",
  });
  const [editingId, setEditingId] = useState(null);

  const questionsRef = collection(db, "questions");

  const fetchQuestions = async () => {
    const snapshot = await getDocs(questionsRef);
    setQuestions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await updateDoc(doc(db, "questions", editingId), newQuestion);
      setEditingId(null);
    } else {
      await addDoc(questionsRef, newQuestion);
    }
    setNewQuestion({
      question: "",
      options: ["", "", "", ""],
      correctAnswer: "",
      category: "",
      explanation: "",
    });
    fetchQuestions();
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "questions", id));
    fetchQuestions();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const jsonData = JSON.parse(text);

    for (let q of jsonData) {
      await addDoc(questionsRef, q);
    }
    fetchQuestions();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-50 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 text-center">
          Quiz Manager
        </h1>

        {/* Bulk Upload */}
        <div className="bg-white border border-gray-300 p-6 rounded-2xl shadow-md mb-8 hover:shadow-lg transition flex flex-col items-center justify-center text-center">
          <label className="text-lg font-semibold mb-4 text-gray-700">
             Bulk Upload Questions (JSON)
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="w-full sm:w-1/2 text-sm text-gray-600 border border-gray-300 rounded-lg cursor-pointer bg-gray-100 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Add/Edit Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-2xl shadow-md p-6 mb-10 hover:shadow-lg transition"
        >
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 flex items-center gap-2">
            {editingId ? " Edit Question" : " Add New Question"}
          </h2>

          {/* Question */}
          <input
            type="text"
            placeholder="Enter Question"
            className="w-full p-4 border rounded-lg mb-4 focus:ring-2 focus:ring-indigo-400 focus:outline-none text-gray-800 font-medium"
            value={newQuestion.question}
            onChange={(e) =>
              setNewQuestion({ ...newQuestion, question: e.target.value })
            }
            required
          />

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {newQuestion.options.map((opt, i) => (
              <input
                key={i}
                type="text"
                placeholder={`Option ${i + 1}`}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none text-gray-700"
                value={opt}
                onChange={(e) => {
                  const newOptions = [...newQuestion.options];
                  newOptions[i] = e.target.value;
                  setNewQuestion({ ...newQuestion, options: newOptions });
                }}
              />
            ))}
          </div>

          {/* Correct Answer & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Correct Answer"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-400 focus:outline-none text-gray-700"
              value={newQuestion.correctAnswer}
              onChange={(e) =>
                setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })
              }
              required
            />
            <input
              type="text"
              placeholder="Category (e.g., Bible)"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none text-gray-700"
              value={newQuestion.category}
              onChange={(e) =>
                setNewQuestion({ ...newQuestion, category: e.target.value })
              }
            />
          </div>

          {/* Explanation */}
          <textarea
            placeholder="Explanation"
            className="w-full p-3 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-700"
            value={newQuestion.explanation}
            onChange={(e) =>
              setNewQuestion({ ...newQuestion, explanation: e.target.value })
            }
          />

          <button
            type="submit"
            className={`w-full py-3 font-semibold rounded-2xl transition text-lg ${
              editingId
                ? "bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {editingId ? "Update Question" : "Add Question"}
          </button>
        </form>

        {/* Questions List */}
        <div>
          <h2 className="text-3xl font-semibold mb-6 text-gray-900">
            All Questions
          </h2>
          <div className="grid gap-6">
            <AnimatePresence>
              {questions.map((q) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white border border-gray-200 rounded-2xl shadow-md p-6 flex flex-col md:flex-row justify-between items-start hover:shadow-lg transition"
                >
                  <div className="mb-4 md:mb-0">
                    <p className="font-bold text-lg text-gray-900 mb-2">{q.question}</p>
                    <ul className="list-disc pl-6 text-gray-700 mb-2 space-y-1">
                      {q.options.map((opt, i) => (
                        <li key={i}>{opt}</li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                         {q.correctAnswer}
                      </span>
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm font-medium">
                         {q.category || "Uncategorized"}
                      </span>
                    </div>
                    {q.explanation && (
                      <p className="text-gray-600 mt-2 italic">💡 {q.explanation}</p>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row gap-3">
                    <button
                      onClick={() => {
                        setNewQuestion(q);
                        setEditingId(q.id);
                      }}
                      className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-5 py-2 rounded-2xl font-medium transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-2xl font-medium transition"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadQuiz;
