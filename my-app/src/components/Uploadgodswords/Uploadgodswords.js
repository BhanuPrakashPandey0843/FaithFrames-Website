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
} from "firebase/firestore";
import { app } from "../../firebase";

const db = getFirestore(app);

const Uploadgodswords = () => {
  const [form, setForm] = useState({
    title: "",
    image: "",
    description: "",
    duration: "3 Days",
  });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  // Real-time fetch with ordering
  useEffect(() => {
    const q = query(collection(db, "studyPlans"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPlans(data);
    });

    return () => unsub();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title || !form.image || !form.description) {
      alert("⚠️ Please fill all required fields");
      return;
    }
    try {
      setLoading(true);
      await addDoc(collection(db, "studyPlans"), {
        ...form,
        duration:
          form.duration.charAt(0).toUpperCase() + form.duration.slice(1), // normalize
        createdAt: serverTimestamp(),
      });
      alert("✅ Study Plan added");
      setForm({ title: "", image: "", description: "", duration: "3 Days" });
    } catch (error) {
      console.error(error);
      alert("❌ Error adding plan");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "studyPlans", id));
      alert("🗑️ Plan deleted");
    } catch (error) {
      console.error(error);
      alert("❌ Error deleting plan");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-indigo-800 text-center drop-shadow-sm">
          Admin Panel – God&apos;s Words
        </h1>

        {/* Form */}
        <form
          onSubmit={handleAdd}
          className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 md:p-10 transition space-y-5 mb-12"
        >
          <div className="grid md:grid-cols-2 gap-6">
            <input
              type="text"
              name="title"
              placeholder="Enter Plan Title"
              value={form.title}
              onChange={handleChange}
              className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-800 font-medium"
              required
            />
            <input
              type="url"
              name="image"
              placeholder="Enter Image URL"
              value={form.image}
              onChange={handleChange}
              className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-800 font-medium"
              required
            />
          </div>

          {/* Image preview */}
          {form.image && (
            <div className="flex justify-center">
              <img
                src={form.image}
                alt="Preview"
                className="w-40 h-40 object-cover rounded-xl border shadow-md mt-2"
              />
            </div>
          )}

          <textarea
            name="description"
            placeholder="Enter Plan Description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-green-400 focus:outline-none text-gray-800 font-medium"
            required
          />
          <input
            type="text"
            name="duration"
            placeholder="Duration (e.g., 3 Days)"
            value={form.duration}
            onChange={handleChange}
            className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-800 font-medium"
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 font-semibold rounded-2xl transition text-lg ${
              loading
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
            }`}
          >
            {loading ? "Adding..." : "➕ Add Study Plan"}
          </button>
        </form>

        {/* List of Plans */}
        <div className="space-y-6">
          {plans.length === 0 ? (
            <div className="text-center text-gray-600">
              <img
                src="https://cdn-icons-png.flaticon.com/512/4076/4076503.png"
                alt="empty"
                className="mx-auto w-32 mb-4 opacity-70"
              />
              <p>No study plans added yet.</p>
            </div>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white p-6 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between hover:shadow-lg transition"
              >
                <div className="flex items-start gap-4">
                  {plan.image && (
                    <img
                      src={plan.image}
                      alt={plan.title}
                      className="w-24 h-24 object-cover rounded-lg border shadow-sm"
                    />
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {plan.title}
                    </h2>
                    <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                      {plan.description}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Duration: {plan.duration}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(plan.id)}
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

export default Uploadgodswords;
