"use client";
import React, { useEffect, useState } from "react";
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { app } from "../../firebase";

const db = getFirestore(app);

const ProfileManager = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    address: "",
    photoURL: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  //  Realtime Fetch Users
  useEffect(() => {
    const q =
      sortBy === "newest"
        ? query(collection(db, "users"), orderBy("updatedAt", "desc"))
        : sortBy === "oldest"
        ? query(collection(db, "users"), orderBy("updatedAt", "asc"))
        : collection(db, "users");

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    });
    return () => unsub();
  }, [sortBy]);

  //  Handle Input
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  //  Add or Update User
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      alert("Name and Email are required!");
      return;
    }

    try {
      setLoading(true);

      if (editingId) {
        await updateDoc(doc(db, "users", editingId), {
          ...form,
          updatedAt: Date.now(),
        });
        setEditingId(null);
      } else {
        await addDoc(collection(db, "users"), {
          ...form,
          lastScore: 0,
          lastPlayed: new Date(),
          updatedAt: Date.now(),
        });
      }

      setForm({ name: "", email: "", address: "", photoURL: "" });
    } catch (error) {
      console.error("Error saving user:", error);
    } finally {
      setLoading(false);
    }
  };

  //  Edit User
  const handleEdit = (user) => {
    setForm({
      name: user.name || "",
      email: user.email || "",
      address: user.address || "",
      photoURL: user.photoURL || "",
    });
    setEditingId(user.id);
  };

  //  Delete User
  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this user?")) {
      await deleteDoc(doc(db, "users", id));
    }
  };

  //  Filtered Users
  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
            Profile Manager
          </h1>
          <span className="mt-3 md:mt-0 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold shadow">
            Total Users: {users.length}
          </span>
        </div>

        {/* Search + Sort Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center mb-8">
          <input
            type="text"
            placeholder=" Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none text-gray-800"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 text-gray-800"
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="none">Sort: None</option>
          </select>
        </div>

        {/* Add / Edit Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 md:p-8 hover:shadow-xl transition space-y-5 mb-12"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {editingId ? "✏️ Edit User" : " Add New User"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              className="p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none text-gray-800"
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={form.email}
              onChange={handleChange}
              className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-800"
              required
            />
          </div>

          <input
            type="text"
            name="address"
            placeholder="Address"
            value={form.address}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-400 focus:outline-none text-gray-800"
          />

          <input
            type="url"
            name="photoURL"
            placeholder="Profile Image URL"
            value={form.photoURL}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none text-gray-800"
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 font-semibold rounded-2xl transition text-lg ${
              loading
                ? "bg-gray-400 text-white cursor-not-allowed"
                : editingId
                ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {loading
              ? "Saving..."
              : editingId
              ? "Update User"
              : "Add User"}
          </button>
        </form>

        {/* User List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-2xl transition transform hover:-translate-y-1 ${
                editingId === user.id ? "ring-2 ring-yellow-400" : ""
              }`}
            >
              <img
                src={user.photoURL || "https://via.placeholder.com/100"}
                alt={user.name}
                className="w-24 h-24 rounded-full border-4 border-indigo-100 mb-4 object-cover mx-auto"
              />
              <h3 className="text-lg font-bold text-gray-900 text-center">
                {user.name}
              </h3>
              <p className="text-sm text-gray-600 text-center">{user.email}</p>
              <p className="text-xs text-gray-500 text-center mt-1">
                {user.address || "No address provided"}
              </p>

              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={() => handleEdit(user)}
                  className="px-4 py-2 text-sm bg-yellow-400 hover:bg-yellow-500 rounded-lg text-white font-medium shadow"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium shadow"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <p className="text-center text-gray-500 mt-10">
            No users found. Try adjusting your search.
          </p>
        )}
      </div>
    </div>
  );
};

export default ProfileManager;
