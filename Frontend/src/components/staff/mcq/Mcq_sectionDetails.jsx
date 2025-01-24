import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import QuestionModal from "./QuestionModal";
import GroupImage from "../../../assets/bulk.png"; // Ensure the path to your image is correct
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  TextField,
  TablePagination,
} from "@mui/material";
import { jwtDecode } from "jwt-decode";
import ShareModal from "../../../components/staff/mcq/ShareModal";

const Mcq_sectionDetails = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSectionQuestions, setCurrentSectionQuestions] = useState([]); // Questions for current section
  const [availableQuestions, setAvailableQuestions] = useState([]); // All available questions
  const [activeComponent, setActiveComponent] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestionsLocal, setSelectedQuestionsLocal] = useState([]);
  const [activeTab, setActiveTab] = useState("My Device"); // Default tab
  const [highlightStep, setHighlightStep] = useState(1); // Step highlight state
  const [currentPage, setCurrentPage] = useState(1); // Current page for pagination
  const [questionsPerPage] = useState(5); // Number of questions per page
  const [showImage, setShowImage] = useState(true); // Control visibility of the image
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [students, setStudents] = useState([]); // Define students state
  const [filteredStudents, setFilteredStudents] = useState([]); // Define filteredStudents state
  const [selectedStudents, setSelectedStudents] = useState([]); // Define selectedStudents state
  const [sections, setSections] = useState([{
    id: Date.now(), // Add unique ID
    sectionName: "",
    numQuestions: 10,
    sectionDuration: 10,
    markAllotment: 1,
    passPercentage: 50,
    timeRestriction: false,
    submitted: false,
    selectedQuestions: [],
    showDropdown: false // Add showDropdown state for each section
  }]);
  const navigate = useNavigate();
  const [activeSectionIndex, setActiveSectionIndex] = useState(null);
  const [filters, setFilters] = useState({ collegename: "", dept: "" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sharingLink, setSharingLink] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const storedSections = JSON.parse(sessionStorage.getItem("sections")) || [];
    // Ensure each section has an ID
    const sectionsWithIds = storedSections.map(section => ({
      ...section,
      id: section.id || Date.now()
    }));
    setSections(sectionsWithIds);

    // Clear local storage on page refresh or close
    window.addEventListener('beforeunload', () => {
      sessionStorage.clear();
    });

    return () => {
      window.removeEventListener('beforeunload', () => {
        sessionStorage.clear();
      });
    };
  }, []);

  const handleAddQuestion = (sectionIndex) => {
    setIsModalOpen(true);
    setActiveSectionIndex(sectionIndex);
    setSelectedQuestionsLocal([]); // Reset selected questions
    setCurrentSectionQuestions([]); // Reset current section questions
    setQuestions([]); // Reset all questions
    setShowImage(true); // Reset image visibility
    setCurrentPage(1); // Reset pagination
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleOptionSelect = (component, sectionIndex) => {
    setActiveSectionIndex(sectionIndex); // Set the active section index
    setActiveComponent(component);
    handleModalClose(); // Close modal after selecting an option
  };

  const handleInputChange = (e, sectionIndex) => {
    const { name, value, type, checked } = e.target;
    const updatedSections = sections.map((section, index) =>
      index === sectionIndex ? { ...section, [name]: type === "checkbox" ? checked : value } : section
    );
    setSections(updatedSections);
    sessionStorage.setItem("sections", JSON.stringify(updatedSections));
  };

  const handleAddSection = () => {
    setSections([{
      id: Date.now(), // Add unique ID for new section
      sectionName: "",
      numQuestions: 10,
      sectionDuration: 10,
      markAllotment: 1,
      passPercentage: 50,
      timeRestriction: false,
      submitted: false,
      selectedQuestions: [],
      showDropdown: false // Add showDropdown state for each section
    }, ...sections]);
  };

  const handleRemoveSection = (sectionIndex) => {
    const updatedSections = sections.filter((_, index) => index !== sectionIndex);
    setSections(updatedSections);
    sessionStorage.setItem("sections", JSON.stringify(updatedSections));
  };

  const handleSaveQuestions = async (sectionIndex) => {
    try {
      const section = sections[sectionIndex];
      const formattedQuestions = section.selectedQuestions.map(q => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer || q.answer
      }));

      const response = await axios.post(
        "http://localhost:8000/api/mcq/save-assessment-questions/",  // Make sure this URL matches your backend
        {
          sectionName: section.sectionName,
          numQuestions: section.numQuestions,
          sectionDuration: section.sectionDuration,
          markAllotment: section.markAllotment,
          passPercentage: section.passPercentage,
          timeRestriction: section.timeRestriction,
          questions: formattedQuestions
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem("contestToken")}`
          }
        }
      );

      if (response.data.success) {
        alert("Questions saved successfully!");
        const updatedSections = sections.map((section, index) =>
          index === sectionIndex ? { ...section, submitted: true } : section
        );
        setSections(updatedSections);
        sessionStorage.setItem("sections", JSON.stringify(updatedSections));

        // Clear local storage after saving questions
        clearLocalStorage();
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        alert("Unauthorized access. Please log in again.");
        navigate("/login");
      } else {
        console.error("Error saving questions:", error);
        alert(error.response?.data?.error || "Failed to save questions. Please try again.");
      }
    }
  };

  const handlePublish = async () => {
    try {
      const token = localStorage.getItem("contestToken");
      if (!token) {
        alert("Unauthorized access. Please log in again.");
        return;
      }

      // Decode the contestId from the token
      const decodedToken = jwtDecode(token); // Use jwt-decode library
      const contestId = decodedToken?.contestId;
      if (!contestId) {
        alert("Invalid contest token. Please log in again.");
        return;
      }

      // Remove duplicates from questions
      const uniqueQuestions = Array.from(new Set(sections.flatMap(section => section.selectedQuestions).map(JSON.stringify))).map(JSON.parse);

      // Get email addresses of selected students
      const selectedStudentDetails = students.filter((student) => selectedStudents.includes(student.regno));
      const selectedStudentEmails = selectedStudentDetails.map((student) => student.email);

      // Prepare the payload for the request
      const payload = {
        contestId, // Include contestId in the payload
        questions: uniqueQuestions,
        students: selectedStudents,
        studentEmails: selectedStudentEmails,
      };

      // Make the API call to publish questions
      const response = await axios.post(
        "http://localhost:8000/api/mcq/publish/",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200) {
        setSharingLink(`${process.env.REACT_APP_FRONTEND_LINK}/testinstructions/${contestId}`);
        setShareModalOpen(true); // Open the share modal
        alert("Questions published successfully!");
      } else {
        alert(`Failed to publish questions: ${response.data.message || "Unknown error."}`);
      }
    } catch (error) {
      console.error("Error publishing questions:", error);

      // Handle specific errors
      if (error.response) {
        // Server responded with a status other than 2xx
        alert(`Error: ${error.response.data.message || error.response.statusText}`);
      } else if (error.request) {
        // Request made but no response received
        alert("No response from the server. Please try again later.");
      } else {
        // Other errors
        alert("An error occurred while publishing questions. Please try again.");
      }
    } finally {
      // Close the publish dialog regardless of success or failure
      setPublishDialogOpen(false);
    }
  };

  const handleShareModalClose = () => {
    setShareModalOpen(false); // Close the modal
    navigate(`/staffdashboard`); // Navigate to the dashboard
  };

  // Handle CSV Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      alert("Please select a valid CSV file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvText = event.target.result;
        const rows = csvText.split("\n").map((row) => row.split(","));
        const headers = rows[0];
        const dataRows = rows.slice(1).filter((row) => row.length > 1);

        const formattedQuestions = dataRows.map((row) => ({
          id: Date.now() + Math.random(), // Add unique ID for each question
          question: row[0]?.replace(/["]/g, ""),
          options: [
            row[1]?.trim(),
            row[2]?.trim(),
            row[3]?.trim(),
            row[4]?.trim(),
            row[5]?.trim(),
            row[6]?.trim(),
          ].filter(Boolean),
          correctAnswer: row[7]?.trim(),
          negativeMarking: row[8]?.trim(),
          mark: row[9]?.trim(),
          level: "easy",
          tags: [],
        }));

        // Filter out questions that are already used in other sections
        const usedQuestions = sections.reduce((acc, section) => {
          return [...acc, ...section.selectedQuestions];
        }, []);

        const availableNewQuestions = formattedQuestions.filter(
          (newQuestion) =>
            !usedQuestions.some(
              (usedQuestion) => usedQuestion.question === newQuestion.question
            )
        );

        setQuestions(availableNewQuestions);
        setAvailableQuestions(availableNewQuestions);
        setShowImage(false);

        if (availableNewQuestions.length === 0) {
          alert("All uploaded questions are already used in other sections. Please upload different questions.");
        } else if (availableNewQuestions.length < formattedQuestions.length) {
          alert("Some questions were filtered out as they are already used in other sections.");
        }
      } catch (error) {
        console.error("Error processing file:", error);
        alert(`Error processing file: ${error.message}`);
      }
    };

    reader.onerror = (error) => {
      console.error("File reading error:", error);
      alert("Error reading file");
    };

    reader.readAsText(file);
  };

  // Handle Question Selection
  const handleSelectQuestion = (index) => {
    setSelectedQuestionsLocal((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // Handle Select All
  const handleSelectAll = () => {
    if (selectedQuestionsLocal.length === questions.length) {
      setSelectedQuestionsLocal([]);
    } else {
      setSelectedQuestionsLocal(questions.map((_, index) => index));
    }
  };

  // Submit Selected Questions
  const handleSubmitBulkUpload = async () => {
    if (activeSectionIndex === null) {
      alert("Please select a section before adding questions.");
      return;
    }

    const section = sections[activeSectionIndex];
    if (selectedQuestionsLocal.length < section.numQuestions) {
      alert(`Please select at least ${section.numQuestions} questions.`);
      return;
    }

    const selectedQuestions = selectedQuestionsLocal.map(
      (index) => questions[index]
    );

    const updatedSections = sections.map((section, index) =>
      index === activeSectionIndex
        ? { ...section, selectedQuestions: selectedQuestions }
        : section
    );

    // Update sections in state and storage
    setSections(updatedSections);
    sessionStorage.setItem("sections", JSON.stringify(updatedSections));

    // Clear current section data
    setQuestions([]);
    setSelectedQuestionsLocal([]);
    setCurrentSectionQuestions([]);
    setShowImage(true);
    setActiveComponent(null);

    alert("Questions added successfully!");
  };

  useEffect(() => {
    return () => {
      setQuestions([]);
      setSelectedQuestionsLocal([]);
      setCurrentSectionQuestions([]);
      setShowImage(true);
    };
  }, [activeSectionIndex]);

  // Clear local storage
  const clearLocalStorage = () => {
    sessionStorage.removeItem("sections");
  };

  // Pagination Logic
  const indexOfLastQuestion = currentPage * questionsPerPage;
  const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage;
  const currentQuestions = questions.slice(indexOfFirstQuestion, indexOfLastQuestion);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/student/`);
      setStudents(response.data);
      setFilteredStudents(response.data);
    } catch (error) {
      console.error("Failed to fetch students:", error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prevFilters) => ({ ...prevFilters, [name]: value }));
  };

  const applyFilters = () => {
    const filtered = students.filter(
      (student) =>
        (filters.collegename ? student.collegename.includes(filters.collegename) : true) &&
        (filters.dept ? student.dept.includes(filters.dept) : true)
    );
    setFilteredStudents(filtered);
  };

  const handleSelectAllStudents = (e) => {
    if (e.target.checked) {
      setSelectedStudents(filteredStudents.map((student) => student.regno));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleStudentSelect = (regno) => {
    setSelectedStudents((prev) =>
      prev.includes(regno)
        ? prev.filter((id) => id !== regno)
        : [...prev, regno]
    );
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, students]);

  return (
    <div className="bg-white p-6 shadow-md rounded-lg custom-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="bg-yellow-500 p-2 rounded-full">
            <img src="/path-to-icon" alt="Icon" className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-medium">Contest Details</h2>
        </div>
        <button
          className="bg-blue-500 text-white p-2 rounded-md"
          onClick={handleAddSection}
        >
          Add Section
        </button>
      </div>

      {/* Section Cards */}
      {sections.map((section, sectionIndex) => (
        <div key={section.id} className="bg-white p-6 shadow-md rounded-lg mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-gray-800">Section {sectionIndex + 1}</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleRemoveSection(sectionIndex)}
                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 focus:outline-none"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
          <form className="space-y-4">
            {/* Section Name, Number of Questions and Duration (Same line in flex row) */}
            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Section Name *</label>
                <input
                  type="text"
                  name="sectionName"
                  value={section.sectionName}
                  onChange={(e) => handleInputChange(e, sectionIndex)}
                  placeholder="Section"
                  className="w-64 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
                  disabled={section.submitted}
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Number of Questions *</label>
                <input
                  type="number"
                  name="numQuestions"
                  value={section.numQuestions}
                  onChange={(e) => handleInputChange(e, sectionIndex)}
                  placeholder="10"
                  className="w-40 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
                  disabled={section.submitted}
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Section Duration (Min)</label>
                <input
                  type="number"
                  name="sectionDuration"
                  value={section.sectionDuration}
                  onChange={(e) => handleInputChange(e, sectionIndex)}
                  placeholder="10"
                  className="w-40 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
                  disabled={section.submitted}
                />
              </div>
            </div>

            {/* Mark Allotment and Pass Percentage */}
            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Mark Allotment *</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    name="markAllotment"
                    value={section.markAllotment}
                    onChange={(e) => handleInputChange(e, sectionIndex)}
                    placeholder="01"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
                    disabled={section.submitted}
                  />
                  <span className="ml-2">/ Question</span>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Pass Percentage</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    name="passPercentage"
                    value={section.passPercentage}
                    onChange={(e) => handleInputChange(e, sectionIndex)}
                    placeholder="50"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
                    disabled={section.submitted}
                  />
                  <span className="ml-2">%</span>
                </div>
              </div>
            </div>

            {/* Time Restriction Toggle */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Time Restriction *</label>
              <input
                type="checkbox"
                name="timeRestriction"
                checked={section.timeRestriction}
                onChange={(e) => handleInputChange(e, sectionIndex)}
                className="w-6 h-6 text-yellow-500 border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                disabled={section.submitted}
              />
            </div>

            {/* Add Questions Button */}
            {/* Set type to "button" to prevent form submission */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => handleAddQuestion(sectionIndex)}
                className="bg-indigo-900 text-white w-full py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 flex-1"
                disabled={section.submitted}
              >
                Add Questions
              </button>
              <button
                type="button"
                onClick={() => handleSaveQuestions(sectionIndex)}
                className="bg-green-500 text-white w-full py-2 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 flex-1"
                disabled={section.submitted}
              >
                Submit
              </button>
            </div>
          </form>

          {/* Display Selected Questions */}
          {section.selectedQuestions.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Selected Questions</h3>
              <div className="relative">
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition mb-2"
                  onClick={() => {
                    const updatedSections = sections.map((s, index) =>
                      index === sectionIndex ? { ...s, showDropdown: !s.showDropdown } : s
                    );
                    setSections(updatedSections);
                  }}
                >
                  {section.showDropdown ? "Hide Questions" : "Show Questions"}
                </button>
                {section.showDropdown && (
                  <div className="bg-white shadow-md rounded-lg p-4 border border-gray-300">
                    <table className="table-auto w-full bg-white shadow-lg rounded-lg overflow-hidden">
                      <thead className="bg-gray-200 text-gray-800">
                        <tr>
                          <th className="px-4 py-2">Question</th>
                          <th className="px-4 py-2">Options</th>
                          <th className="px-4 py-2">Correct Answer</th>
                          <th className="px-4 py-2">Level</th>
                          <th className="px-4 py-2">Tags</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.selectedQuestions.map((q, index) => (
                          <tr
                            key={index}
                            className={`${
                              index % 2 === 0 ? "bg-gray-100" : "bg-white"
                            } text-gray-800`}
                          >
                            <td className="px-4 py-2">{q.question}</td>
                            <td className="px-4 py-2">{q.options.join(", ")}</td>
                            <td className="px-4 py-2">{q.correctAnswer}</td>
                            <td className="px-4 py-2 text-center">{q.level}</td>
                            <td className="px-4 py-2 text-center">{q.tags.join(", ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination Controls for Selected Questions */}
                    <div className="flex justify-between mt-4">
                      <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-gray-600">
                        Page {currentPage} of {Math.ceil(section.selectedQuestions.length / questionsPerPage)}
                      </span>
                      <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === Math.ceil(section.selectedQuestions.length / questionsPerPage)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {isModalOpen && (
        <QuestionModal
          onClose={handleModalClose}
          handleCreateManually={() => handleOptionSelect("createManually", activeSectionIndex)}
          handleBulkUpload={() => handleOptionSelect("bulkUpload", activeSectionIndex)}
          handleMcqlibrary={() => handleOptionSelect("library", activeSectionIndex)}
          handleAi={() => handleOptionSelect("ai", activeSectionIndex)}
        />
      )}
      {activeComponent === "bulkUpload" && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl overflow-y-auto max-h-[80vh]">
            {/* Title Section */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Upload Files</h1>
              <p className="text-gray-500 text-sm">
                Easily add questions by uploading your prepared files as{" "}
                <span className="font-medium text-gray-600">csv, xlsx etc.</span>
              </p>
            </div>
            <button
              onClick={() => setActiveComponent(null)}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition mb-2"
            >
              Back
            </button>

            {/* Main Upload Section */}
            <div className="bg-white shadow-lg rounded-3xl p-8 w-full">
              {/* Upload Section */}
              <div className="flex flex-col items-center justify-center mb-6">
                {showImage && (
                  <img
                    src={GroupImage}
                    alt="Upload Illustration"
                    className="w-48 h-48 object-contain mb-4"
                  />
                )}
                <label
                  htmlFor="fileInput"
                  className="bg-yellow-400 text-black px-6 py-3 rounded-full shadow hover:bg-yellow-500 cursor-pointer transition"
                >
                  {showImage ? "Upload CSV" : "Add Question"}
                </label>
                <input
                  type="file"
                  id="fileInput"
                  style={{ display: "none" }}
                  accept=".csv"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            {/* Questions Preview Section */}
            {questions.length > 0 && (
              <div className="bg-white shadow-lg rounded-3xl p-6 mt-8 w-full">
                <h2 className="text-2xl font-semibold mb-4">
                  Questions Preview (Available: {questions.length})
                </h2>
                <div className="flex justify-between mb-4">
                  <button
                    onClick={handleSelectAll}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    {selectedQuestionsLocal.length === questions.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <table className="table-auto w-full bg-white shadow-lg rounded-lg overflow-hidden">
                  <thead className="bg-gray-200 text-gray-800">
                    <tr>
                      <th className="px-4 py-2">Select</th>
                      <th className="px-4 py-2">Question</th>
                      <th className="px-4 py-2">Options</th>
                      <th className="px-4 py-2">Correct Answer</th>
                      <th className="px-4 py-2">Level</th>
                      <th className="px-4 py-2">Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentQuestions.map((q, index) => (
                      <tr
                        key={index}
                        className={`${
                          index % 2 === 0 ? "bg-gray-100" : "bg-white"
                        } text-gray-800`}
                      >
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedQuestionsLocal.includes(indexOfFirstQuestion + index)}
                            onChange={() => handleSelectQuestion(indexOfFirstQuestion + index)}
                          />
                        </td>
                        <td className="px-4 py-2">{q.question}</td>
                        <td className="px-4 py-2">{q.options.join(", ")}</td>
                        <td className="px-4 py-2">{q.correctAnswer}</td>
                        <td className="px-4 py-2 text-center">{q.level}</td>
                        <td className="px-4 py-2 text-center">{q.tags.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="flex justify-between mt-4">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-gray-600">
                    Page {currentPage} of {Math.ceil(questions.length / questionsPerPage)}
                  </span>
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === Math.ceil(questions.length / questionsPerPage)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleSubmitBulkUpload}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Submit Selected Questions
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {activeComponent === "library" && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl overflow-y-auto max-h-[80vh]">
            <McqLibrary
              onClose={() => setActiveComponent(null)}
              onQuestionsSelected={(selected) => {
                const updatedSections = sections.map((section, index) =>
                  index === activeSectionIndex
                    ? { ...section, selectedQuestions: selected }
                    : section
                );
                setSections(updatedSections);
                sessionStorage.setItem("sections", JSON.stringify(updatedSections));
                setActiveComponent(null);
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-8">
        <button
          onClick={() => setPublishDialogOpen(true)}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow hover:bg-blue-700"
        >
          Publish
        </button>
      </div>

      <Dialog open={publishDialogOpen} onClose={() => setPublishDialogOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Select Students</DialogTitle>
        <DialogContent>
          <Box mb={3}>
            <TextField
              label="Filter by College Name"
              name="collegename"
              variant="outlined"
              fullWidth
              margin="dense"
              value={filters.collegename}
              onChange={handleFilterChange}
            />
            <TextField
              label="Filter by Department"
              name="dept"
              variant="outlined"
              fullWidth
              margin="dense"
              value={filters.dept}
              onChange={handleFilterChange}
            />
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={
                        selectedStudents.length > 0 &&
                        selectedStudents.length < filteredStudents.length
                      }
                      checked={
                        filteredStudents.length > 0 &&
                        selectedStudents.length === filteredStudents.length
                      }
                      onChange={handleSelectAllStudents}
                    />
                  </TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Registration Number</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>College Name</TableCell>
                  <TableCell>Email</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((student) => (
                    <TableRow key={student.regno} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedStudents.includes(student.regno)}
                          onChange={() => handleStudentSelect(student.regno)}
                        />
                      </TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.regno}</TableCell>
                      <TableCell>{student.dept}</TableCell>
                      <TableCell>{student.collegename}</TableCell>
                      <TableCell>{student.email}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={filteredStudents.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setPublishDialogOpen(false)}
            color="primary"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button onClick={handlePublish} color="primary" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      <ShareModal
        open={shareModalOpen}
        onClose={handleShareModalClose}
        shareLink={sharingLink}
      />
    </div>
  );
};

const McqLibrary = ({ onClose, onQuestionsSelected }) => {
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  // Fetch questions from API
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('contestToken');
        if (!token) {
          alert('Unauthorized access. Please log in again.');
          return;
        }

        const response = await axios.get('http://127.0.0.1:8000/api/fetch-all-questions/', {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Ensure tags are always arrays
        const sanitizedQuestions = response.data.questions.map(question => ({
          ...question,
          tags: Array.isArray(question.tags) ? question.tags : []
        }));

        setQuestions(sanitizedQuestions);
        setFilteredQuestions(sanitizedQuestions);
        setError(null);
      } catch (error) {
        console.error('Error fetching questions:', error);
        setError('Failed to fetch questions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Filter questions based on search input
  useEffect(() => {
    if (filter) {
      setFilteredQuestions(
        questions.filter((q) =>
          q.question.toLowerCase().includes(filter.toLowerCase())
        )
      );
    } else {
      setFilteredQuestions(questions);
    }
  }, [filter, questions]);

  // Toggle question selection
  const toggleQuestionSelection = (index) => {
    setSelectedQuestions((prevSelected) =>
      prevSelected.includes(index)
        ? prevSelected.filter((id) => id !== index)
        : [...prevSelected, index]
    );
  };

  // Submit Selected Questions
  const handleSubmit = async () => {
    const selected = selectedQuestions.map((index) => questions[index]);
    onQuestionsSelected(selected);
    onClose();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Question Library</h1>
          <p className="text-slate-600">Select and preview questions from your collection</p>
        </div>

        {loading && <p>Loading questions...</p>}
        {error && <p className="text-red-600">{error}</p>}

        <div className="grid grid-cols-3 gap-8">
          {/* Left Panel */}
          <div className="col-span-2 space-y-4">
            {/* Search Bar */}
            <div className="sticky top-4 bg-white p-4 shadow rounded-lg">
              <div className="flex items-center">
                <Search className="mr-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="flex-grow px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Questions List */}
            {filteredQuestions.map((question, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg cursor-pointer ${
                  selectedQuestions.includes(index) ? 'bg-blue-100 border-blue-500' : ''
                }`}
                onClick={() => toggleQuestionSelection(index)}
              >
                <h3 className="font-medium">{question.question}</h3>
                <p>
                  <strong>Level:</strong> {question.level} | <strong>Tags:</strong>{' '}
                  {Array.isArray(question.tags) ? question.tags.join(', ') : 'No tags'}
                </p>
              </div>
            ))}
          </div>

          {/* Right Panel */}
          <div className="col-span-1">
            <div className="bg-white shadow p-4 rounded-lg">
              <h2 className="text-lg font-bold mb-4">Selected Questions</h2>
              {selectedQuestions.length === 0 ? (
                <p className="text-slate-500">No questions selected</p>
              ) : (
                <ul>
                  {selectedQuestions.map((index) => {
                    const question = questions[index];
                    return (
                      <li key={index} className="border-b py-2">
                        {question?.question}
                      </li>
                    );
                  })}
                </ul>
              )}
              <button
                onClick={handleSubmit}
                className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded-lg"
              >
                Save Selected Questions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mcq_sectionDetails;