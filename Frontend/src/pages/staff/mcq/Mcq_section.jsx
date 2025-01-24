import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Mcq_sectionDetails from "../../../components/staff/mcq/Mcq_sectionDetails";
import QuestionModal from "../../../components/staff/mcq/QuestionModal";
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

const Mcq_section = ({ formData, setFormData }) => {
  const navigate = useNavigate();
  const { contestId } = useParams();
  const location = useLocation();
  const requiredQuestions = location.state?.requiredQuestions || 0;
  const [sections, setSections] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [filters, setFilters] = useState({ collegename: "", dept: "" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [sharingLink, setSharingLink] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/student/`);
        setStudents(response.data);
        setFilteredStudents(response.data);
      } catch (error) {
        console.error("Failed to fetch students:", error);
      }
    };

    fetchStudents();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prevFilters) => ({ ...prevFilters, [name]: value }));
  };

  useEffect(() => {
    const applyFilters = () => {
      const filtered = students.filter(
        (student) =>
          (filters.collegename ? student.collegename.includes(filters.collegename) : true) &&
          (filters.dept ? student.dept.includes(filters.dept) : true)
      );
      setFilteredStudents(filtered);
    };

    applyFilters();
  }, [filters, students]);

  const handleSelectAll = (e) => {
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

  const handleAddSection = () => {
    const newSection = {
      id: sections.length + 1,
      sectionName: `Section ${sections.length + 1}`,
      numQuestions: 10,
      sectionDuration: 10,
    };
    setSections([...sections, newSection]);
  };

  const handleAddQuestion = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleFinalSubmit = async () => {
    const token = localStorage.getItem("contestToken");
    if (!token) {
      alert("Unauthorized access. Please start the contest again.");
      return;
    }

    try {
      const response = await axios.post(
        "/api/submit-sections",
        { sections },
        {
          headers: {
            Authorization: `Bearer ${token}`, // Corrected the typo 'Bearer'
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200) {
        alert("Sections submitted successfully!");
      } else {
        alert(`Failed to submit sections: ${response.data.message || "Unknown error."}`);
      }
    } catch (error) {
      console.error("Error submitting sections:", error);
      if (error.response) {
        // Server responded with a status other than 2xx
        alert(`Error: ${error.response.data.message || error.response.statusText}`);
      } else if (error.request) {
        // Request made but no response received
        alert("No response from the server. Please try again later.");
      } else {
        // Other errors
        alert("An error occurred while submitting sections. Please try again.");
      }
    }
  };

  const updateSection = (id, updatedSection) => {
    const updatedSections = sections.map((section) =>
      section.id === id ? updatedSection : section
    );
    setSections(updatedSections);
  };

  const handlePublish = async () => {
    try {
      // Retrieve the contest token from localStorage
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      <div className="bg-gray-50 p-6 rounded-lg shadow-md w-full max-w-4xl">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">
          Section Details
        </h3>
        <p className="text-lg text-gray-600 mb-8">
          Organize your test with sections or add questions directly for a
          tailored organization.
        </p>
        <div className="flex justify-between">
          <button
            className="w-48 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 active:bg-blue-800 transition-all duration-300"
            onClick={handleAddSection}
          >
            Add Section
          </button>
          <button
            className="w-48 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 active:bg-blue-800 transition-all duration-300"
            onClick={handleAddQuestion}
          >
            Add Question
          </button>
        </div>
      </div>

      {/* Render Sections */}
      <div className="w-full max-w-4xl mt-6">
        {sections.map((section) => (
          <Mcq_sectionDetails
            key={section.id}
            section={section}
            onUpdate={(updatedSection) => updateSection(section.id, updatedSection)}
          />
        ))}
      </div>

      <div className="mt-8">
        <button
          onClick={handleFinalSubmit}
          className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md shadow hover:bg-green-700"
        >
          Submit section
        </button>
      </div>

      {isModalOpen && (
        <QuestionModal
          showModal={isModalOpen}
          onClose={handleModalClose}
          handleCreateManually={() => navigate('/mcq/CreateQuestion')}
          handleBulkUpload={() => navigate('/mcq/bulkUpload')}
          handleMcqlibrary={() => navigate('/mcq/McqLibrary')}
          handleAi={() => navigate('/mcq/aigenerator')}
        />
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
                      onChange={handleSelectAll}
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

export default Mcq_section;
