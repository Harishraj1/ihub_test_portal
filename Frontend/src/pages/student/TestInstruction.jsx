import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import image from '../../assets/test_instruction_image.png';
import { FaCheckCircle, FaTimesCircle, FaUserCheck, FaMicrophoneSlash, FaExpand, FaMobile } from 'react-icons/fa'; // Importing new icons
import Navbar from "./Navbar";

const TestInstructions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { contestId } = useParams();
  const { assessment_type } = location.state || {};
  const [loading, setLoading] = useState(false);
  const [mcqTests, setMcqTests] = useState([]);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  // Coding Assessment API function
  const start_codingTest = async (contestId, studentId) => {
    try {
      const startTestResponse = await axios.post(`${API_BASE_URL}/api/start_test/`, {
        contest_id: contestId,
        student_id: studentId,
      });

      console.log("Fetched from start_test API:", startTestResponse.data.message);

      const saveReportResponse = await axios.post(`${API_BASE_URL}/api/save_coding_report/`, {
        contest_id: contestId,
        student_id: studentId,
      });

      console.log("Fetched from save_contest_report API:", saveReportResponse.data.message);

    } catch (error) {
      console.error("Error during API calls:", error);
      throw error;
    }
  };

  // MCQ Assessment API function
  const start_mcqTest = async (contestId, studentId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/start_mcqtest/`, {
        contest_id: contestId,
        student_id: studentId,
      });
      console.log("Fetched from API:", response.data.message);
    } catch (error) {
      console.error("Error starting test:", error);
      throw error;
    }
  };

  const fetchMcqTests = async (regno) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/student/mcq-tests?regno=${regno}`, {
        withCredentials: true,
      });

      const formattedTests = response.data.map((test) => {
        const { hours = 0, minutes = 0 } = test.testConfiguration?.duration || {};
        const duration = (parseInt(hours) * 3600) + (parseInt(minutes) * 60);
        const fullScreenMode = test.testConfiguration?.fullScreenMode || false;
        const faceDetection = test.testConfiguration?.faceDetection || false;
        const passPercentage = test.testConfiguration?.passPercentage || 0;

        localStorage.setItem(`testDuration_${test._id}`, duration);
        localStorage.setItem(`fullScreenMode_${test._id}`, fullScreenMode);
        localStorage.setItem(`faceDetection_${test._id}`, faceDetection);

        return {
          testId: test._id,
          name: test.assessmentOverview?.name || "Unknown Test",
          description: test.assessmentOverview?.description || "No description available.",
          starttime: test.assessmentOverview?.registrationStart || "No Time",
          endtime: test.assessmentOverview?.registrationEnd || "No Time",
          questions: parseInt(test.testConfiguration?.questions, 10) || 0,
          duration: `${hours} hours ${minutes} minutes`,
          passPercentage: passPercentage,
          assessment_type: "mcq",
          status: test.status,
          fullScreenMode,
          faceDetection,
          deviceRestriction: test.testConfiguration?.deviceRestriction || false,
          noiseDetection: test.testConfiguration?.noiseDetection || false,
          guidelines: test.assessmentOverview?.guidelines || "No guidelines available.",
          resultVisibility: test.testConfiguration?.resultVisibility || "Host Control",
          shuffleQuestions: test.testConfiguration?.shuffleQuestions || false,
          shuffleOptions: test.testConfiguration?.shuffleOptions || false,
        };
      });


      return formattedTests;
    } catch (err) {
      if (err.response?.status === 401) {
        // Redirect to login if unauthorized
        navigate("/studentlogin");
      } else {
        console.error("Failed to fetch test details");
        console.error("Error fetching test details:", err);
      }
    }
  };

  useEffect(() => {
    const studentId = localStorage.getItem("studentId");
    if (studentId && contestId) {
      localStorage.setItem("contestState", JSON.stringify({ contest_id: contestId, student_id: studentId }));

      const fetchTests = async () => {
        const tests = await fetchMcqTests(studentId);
        setMcqTests(tests);
      };

      fetchTests();
    }
  }, [contestId]);

  const handleStartTest = async () => {
    const studentId = localStorage.getItem("studentId");
    if (!studentId) {
      alert("Student ID not found. Please log in again.");
      return;
    }

    setLoading(true);
    try {
      if (assessment_type === "coding") {
        await start_codingTest(contestId, studentId);
        navigate(`/coding/${contestId}`, {
          state: { contest_id: contestId, student_id: studentId }
        });
      } else if (assessment_type === "mcq") {
        await start_mcqTest(contestId, studentId);
        navigate(`/mcq/${contestId}`, {
          state: { contest_id: contestId, student_id: studentId }
        });
      }
    } catch (error) {
      console.error("Error starting test:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString(undefined, options);
  };

  const currentTest = mcqTests.find(test => test.testId === contestId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* Main Container */}
      <div className="flex flex-grow bg-white mx-12 mt-8 mb-4 border-2 rounded-2xl">
        {/* Left Container */}
        <div className="w-4/6 p-8 border-r border-gray-300 text-lg">
          {/* Test Overview */}
          <div className="flex items-center gap-6 mb-8">
            {/* Image Section */}
            <div className="w-3/5">
              <img
                src={image}
                alt="test_instruction_img"
                className="w-full h-auto rounded-lg shadow-md"
              />
            </div>

            {/* Test Info */}
            <div className="text-lg font-bold text-[#00296B] space-y-2">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td>Estimated Duration</td>
                    <td className='px-4'>:</td>
                    <td className='text-black font-medium'>{currentTest?.duration || "0 Hour"}</td>
                  </tr>
                  <tr>
                    <td>No. of Questions</td>
                    <td className='px-4'>:</td>
                    <td className='text-black font-medium'>{currentTest?.questions || "0"}</td>
                  </tr>
                  <tr>
                    <td>No. of Sections</td>
                    <td className='px-4'>:</td>
                    <td className='text-black font-medium'>{currentTest?.sections ? "Yes" : "No"}</td>
                  </tr>
                  <tr>
                    <td>Pass Percentage</td>
                    <td className='px-4'>:</td>
                    <td className='text-black font-medium'>{currentTest?.passPercentage || "0"}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Test Name */}
          <h1 className="text-[#00296B] font-bold text-4xl mb-6">
            {currentTest?.name || "Test Name"}
          </h1>

          {/* Registration Info */}
          <div className="flex justify-between mb-6">
            <p>
              <span className='text-[#00296B] font-bold'>Registration Start Date : </span> {formatDate(currentTest?.starttime) || "23 AUG 2023 Time: 7 PM"}
            </p>
            <p>
              <span className='text-[#00296B] font-bold'>Registration End Date : </span> {formatDate(currentTest?.endtime) || "24 AUG 2023 Time: 7 PM"}
            </p>
          </div>

          {/* Description */}
          <div className="mb-6 text-gray-700 leading-relaxed">
            {currentTest?.description ||
              "Embark on a journey to sharpen your analytical thinking and problem-solving skills with our course."}
          </div>

          {/* Instructions */}
          <div className="mb-8">
            <p className="mb-4 text-[#00296B] text-lg font-bold ">Instructions: Read carefully; contact the Department for clarifications.</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Questions: {currentTest?.questions || "30"} questions, 1 mark each.</li>
              <li>Duration: {currentTest?.duration || "45"} minutes.</li>
              <li>
                Device: Use a stable internet connection on a laptop or suitable device (iPhones not recommended).
              </li>
              <li>Submission: Click "Submit" after each question.</li>
              <li>Fair Play: Unfair practices, including plagiarism, result in disqualification.</li>
            </ul>
          </div>
        </div>

        {/* Right Container */}
        <div className="w-1/3 text-lg flex flex-col text-center">
          <h1 className="font-bold text-2xl text-[#00296B] py-6 border-b border-gray-300">
            Question Settings
          </h1>

          {/* Proctoring Settings */}
          <div className="border border-gray-300 mx-8 rounded-2xl mt-6 mb-4">
            <div className='text-left border-b border-gray-300 py-2 pl-4 leading-6'>
              <h2 className="font-bold text-[#00296B] mb-1">Proctoring Enabled</h2>
              <p className="text-gray-700 mb-2">This enables in Proctoring Candidates</p>
            </div>

            <div className="text-[#00296B] space-y-4 p-4">
              <div className="flex justify-between">
                <p>Face Detection</p>
                {currentTest?.faceDetection ? (
                  <FaCheckCircle className="text-green-500 text-2xl" />
                ) : (
                  <FaTimesCircle className="text-red-500 text-2xl" />
                )}
              </div>
              <div className="flex justify-between">
                <p>Noise Detection</p>
                {currentTest?.noiseDetection ? (
                  <FaCheckCircle className="text-green-500 text-2xl" />
                ) : (
                  <FaTimesCircle className="text-red-500 text-2xl" />
                )}
              </div>
              <div className="flex justify-between">
                <p>Full Screen Mode</p>
                {currentTest?.fullScreenMode ? (
                  <FaCheckCircle className="text-green-500 text-2xl" />
                ) : (
                  <FaTimesCircle className="text-red-500 text-2xl" />
                )}
              </div>
              <div className="flex justify-between">
                <p>Mobile Access Restriction</p>
                {currentTest?.deviceRestriction ? (
                  <FaCheckCircle className="text-green-500 text-2xl" />
                ) : (
                  <FaTimesCircle className="text-red-500 text-2xl" />
                )}
              </div>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="space-y-4 mx-8 text-left text-[#00296B]">
            <div className="border border-gray-300 rounded-2xl p-4">
              <span> • </span>
              {currentTest?.resultVisibility === "Host Control"
                ? "Host will release the result"
                : "Results will be released immediately"}
            </div>
            <div className="border border-gray-300 rounded-2xl p-4">
              <span> • </span>
              Minimum Pass Percentage: {currentTest?.passPercentage || "50"}%
            </div>
            <div className="border border-gray-300 rounded-2xl p-4">
              <span> • </span>
              {currentTest?.shuffleQuestions
                ? "The questions will be shuffled"
                : "The questions will not be shuffled"}
            </div>
            <div className="border border-gray-300 rounded-2xl p-4">
              <span> • </span>
              {currentTest?.shuffleOptions
                ? "The options will be shuffled"
                : "The options will not be shuffled"}
            </div>
          </div>

          {/* Publish Button */}
          <div className="mt-10 mb-4 pt-4 border-t border-t-gray-300">
            <button
              onClick={handleStartTest}
              disabled={loading}
              className="px-10 py-4 bg-[#facc15] text-white rounded-full font-semibold text-lg hover:bg-[#e5b810] transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Start Test'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestInstructions;




