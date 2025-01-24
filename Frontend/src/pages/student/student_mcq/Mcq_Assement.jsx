import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../../../components/staff/mcq/Header";
import Question from "../../../components/staff/mcq/Question";
import Sidebar from "../../../components/staff/mcq/Sidebar";
import useNoiseDetection from "../../../components/staff/mcq/useNoiseDetection";
import useFullScreenMode from "../../../components/staff/mcq/useFullScreenMode";
import useDeviceRestriction from "../../../components/staff/mcq/useDeviceRestriction";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import { useTheme, useMediaQuery } from "@mui/material";
import FaceDetectionComponent from "../../../components/staff/mcq/useVideoDetection"; // Import the FaceDetectionComponent

export default function Mcq_Assessment() {
  const { contestId } = useParams();
  const studentId = sessionStorage.getItem("studentId");
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState(() => {
    const storedAnswers = sessionStorage.getItem(`selectedAnswers_${contestId}`);
    return storedAnswers ? JSON.parse(storedAnswers) : {};
  });
  const [reviewStatus, setReviewStatus] = useState(() => {
    const storedReviewStatus = sessionStorage.getItem(`reviewStatus_${contestId}`);
    return storedReviewStatus ? JSON.parse(storedReviewStatus) : {};
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showNoiseWarningModal, setShowNoiseWarningModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasFocus, setHasFocus] = useState(true);
  const [fullscreenWarnings, setFullscreenWarnings] = useState(0);
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState(0);
  const [noiseDetectionCount, setNoiseDetectionCount] = useState(0);
  const [faceDetectionWarning, setFaceDetectionWarning] = useState('');
  const lastActiveTime = useRef(Date.now());
  const lastWarningTime = useRef(Date.now());
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
  const [isFreezePeriodOver, setIsFreezePeriodOver] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  const disableAutoFullscreen = false;

  // Define warning limits
  const warningLimits = {
    fullscreen: 3,
    tabSwitch: 1,
    noiseDetection: 2,
    faceDetection: 3,
  };

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        console.log("Fetching questions for contestId:", contestId);
        const response = await axios.get(
          `${API_BASE_URL}/api/mcq/get_mcqquestions/${contestId}`
        );
        console.log("API Response:", response.data);

        if (response.data && response.data.questions) {
          setQuestions(response.data.questions);
          const { hours, minutes } = response.data.duration;
          const totalDuration = parseInt(hours) * 3600 + parseInt(minutes) * 60;
          setDuration(totalDuration);

          const startTime = sessionStorage.getItem(`startTime_${contestId}`);
          if (startTime) {
            const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            setRemainingTime(totalDuration - elapsedTime);
          } else {
            sessionStorage.setItem(`startTime_${contestId}`, Date.now());
            setRemainingTime(totalDuration);
          }
        } else {
          console.error("Invalid API response structure:", response.data);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching questions:", error);
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [contestId, studentId]);

  useEffect(() => {
    sessionStorage.setItem(`selectedAnswers_${contestId}`, JSON.stringify(selectedAnswers));
    sessionStorage.setItem(`reviewStatus_${contestId}`, JSON.stringify(reviewStatus));
  }, [selectedAnswers, reviewStatus, contestId]);

  const handleAnswerSelect = (index, answer) => {
    setSelectedAnswers((prev) => ({ ...prev, [index]: answer }));
  };

  const handleReviewMark = (index) => {
    setReviewStatus((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const addWarning = (type) => {
    const currentTime = Date.now();
    if (currentTime - lastWarningTime.current < 1000) {
      return; // Debounce warnings
    }
    lastWarningTime.current = currentTime;

    if (type === 'fullscreen') {
      setFullscreenWarnings((prevWarnings) => {
        const newWarnings = prevWarnings + 1;
        sessionStorage.setItem(`fullscreenWarnings_${contestId}`, newWarnings);
        return newWarnings;
      });
    } else if (type === 'tabSwitch') {
      setTabSwitchWarnings((prevWarnings) => {
        const newWarnings = prevWarnings + 1;
        sessionStorage.setItem(`tabSwitchWarnings_${contestId}`, newWarnings);
        return newWarnings;
      });
    }
    setShowWarningModal(true);
  };

  const handleNoiseDetection = () => {
    setNoiseDetectionCount((prevCount) => {
      const newCount = prevCount + 1;
      sessionStorage.setItem(`noiseDetectionCount_${contestId}`, newCount);
      return newCount;
    });
    setShowNoiseWarningModal(true);
  };

  const fullScreenMode = useFullScreenMode(contestId, isTestFinished, addWarning);
  const noiseDetection = useNoiseDetection(contestId, handleNoiseDetection);
  const { openDeviceRestrictionModal, handleDeviceRestrictionModalClose } = useDeviceRestriction(contestId);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleFinish = useCallback(async () => {
    try {
      // Fetch FullscreenWarning from session storage
      const fullscreenWarning = sessionStorage.getItem(`fullscreenWarnings_${contestId}`);
      // Fetch NoiseWarning from session storage
      const noiseWarning = sessionStorage.getItem(`noiseDetectionCount_${contestId}`);
      // Fetch FaceWarning from session storage
      const faceWarning = sessionStorage.getItem(`FaceDetectionCount_${contestId}`);
      const formattedAnswers = {};
      questions.forEach((question, index) => {
        // Check if the question was answered
        formattedAnswers[question.text] = selectedAnswers[index] || "notattended";
      });

      const resultVisibility = localStorage.getItem(`resultVisibility_${contestId}`);
      const ispublish = resultVisibility === "Immediate release";

      const payload = {
        contestId,
        answers: formattedAnswers,
        ispublish: ispublish,
        FullscreenWarning: fullscreenWarning,  // Updated field name
        NoiseWarning: noiseWarning,  // Updated field name
        FaceWarning: faceWarning,
      };
  
      const response = await axios.post(
        `${API_BASE_URL}/api/mcq/submit_assessment/`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
      if (response.status === 200) {
        navigate("/studentdashboard");
      }
  
      console.log("Test submitted successfully:", response.data);
      alert("Test submitted successfully!");
  
      setIsTestFinished(true);
  
      sessionStorage.removeItem(`fullscreenWarnings_${contestId}`);
      sessionStorage.removeItem(`tabSwitchWarnings_${contestId}`);
      sessionStorage.removeItem(`noiseDetectionCount_${contestId}`);
      sessionStorage.removeItem(`FaceDetectionCount_${contestId}`);
    } catch (error) {
      console.error("Error submitting test:", error);
      alert("Failed to submit the test.");
    }
  }, [contestId, questions, selectedAnswers, fullscreenWarnings, tabSwitchWarnings, navigate]);
  

  useEffect(() => {
    const freezeTimeout = setTimeout(() => {
      setIsFreezePeriodOver(true); // Enable auto-finish after 5 seconds
    }, 5000);

   return() => clearTimeout(freezeTimeout);
   }, []); 
  
  useEffect(() => {
    if (remainingTime > 0) {
      const interval = setInterval(() => {
        setRemainingTime((prevTime) => Math.max(prevTime - 1, 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [remainingTime]);

  useEffect(() => {
    const disableRightClick = (e) => {
      if (fullScreenMode) {
        e.preventDefault();
      }
    };
    const disableTextSelection = (e) => {
      if (fullScreenMode) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", disableRightClick);
    document.addEventListener("selectstart", disableTextSelection);
    return () => {
      document.removeEventListener("contextmenu", disableRightClick);
      document.removeEventListener("selectstart", disableTextSelection);
    };
  }, [fullScreenMode]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isTestFinished && fullScreenMode) {
        e.preventDefault();
        e.returnValue = "";
        addWarning("tabSwitch");
        return "";
      }
    };
    const handleBlur = () => {
      if (!isTestFinished && fullScreenMode) {
        setHasFocus(false);
        addWarning("tabSwitch");
      }
    };
    const handleFocus = () => {
      setHasFocus(true);
    };
    const handleVisibilityChange = () => {
      if (!isTestFinished && fullScreenMode) {
        if (document.hidden) {
          const currentTime = Date.now();
          if (currentTime - lastActiveTime.current > 500) {
            addWarning("tabSwitch");
          }
        }
        lastActiveTime.current = Date.now();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const focusCheckInterval = setInterval(() => {
      if (!isTestFinished && !document.hasFocus() && fullScreenMode) {
        addWarning("tabSwitch");
      }
    }, 1000);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(focusCheckInterval);
    };
  }, [isTestFinished, fullScreenMode]);

  useEffect(() => {
    // Check if all warning counts exceed their limits
    const allLimitsExceeded =
      fullscreenWarnings >= warningLimits.fullscreen &&
      tabSwitchWarnings >= warningLimits.tabSwitch &&
      noiseDetectionCount >= warningLimits.noiseDetection &&
      parseInt(sessionStorage.getItem(`FaceDetectionCount_${contestId}`)) >= warningLimits.faceDetection;

    if (allLimitsExceeded) {
      handleFinish();
    }
  }, [fullscreenWarnings, tabSwitchWarnings, noiseDetectionCount, handleFinish]);

  const actuallyEnforceFullScreen = async () => {
    try {
      const element = document.documentElement;
      if (
        !document.fullscreenElement &&
        !document.webkitFullscreenElement &&
        !document.mozFullScreenElement &&
        !document.msFullscreenElement
      ) {
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          await element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
          await element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
          await element.msRequestFullscreen();
        }
      }
    } catch (error) {
      console.error("Error requesting fullscreen mode:", error);
    }
  };

  const handleFullscreenReEntry = async () => {
    setShowWarningModal(false);
    if (!disableAutoFullscreen && !fullScreenMode) {
      try {
        await actuallyEnforceFullScreen();
      } catch (error) {
        console.error("Error returning to fullscreen:", error);
        setTimeout(handleFullscreenReEntry, 500);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-700">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-xl text-gray-700 mb-4">No questions available</p>
          <button
            onClick={() => navigate("/studentdashboard")}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50 text-xs sm:text-sm md:text-base"
      style={{
        userSelect: fullScreenMode ? "none" : "auto",
        WebkitUserSelect: fullScreenMode ? "none" : "auto",
        MozUserSelect: fullScreenMode ? "none" : "auto",
        msUserSelect: fullScreenMode ? "none" : "auto",
        pointerEvents: !hasFocus ? "none" : "auto",
        filter: !hasFocus ? "blur(5px)" : "none",
      }}
      onCopy={(e) => fullScreenMode && e.preventDefault()}
      onCut={(e) => fullScreenMode && e.preventDefault()}
      onPaste={(e) => fullScreenMode && e.preventDefault()}
      onKeyDown={(e) => fullScreenMode && e.preventDefault()}
    >
      <meta
        httpEquiv="Content-Security-Policy"
        content="frame-ancestors 'none'"
      ></meta>
      <div className="max-w-[1800px] max-h-[1540px] mx-auto p-3 sm:p-6">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mt-4 sm:mt-12">
          <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
            <Header duration={remainingTime} />
          </div>

          <div className="absolute top-4 right-4 lg:hidden z-50">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="p-2 text-gray-700 bg-gray-200 rounded-md"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 min-h-[600px] sm:min-h-[750px] mt-2 sm:mt-7 relative">
            <div className="flex-grow relative">
              <Question
                question={questions[currentIndex]}
                currentIndex={currentIndex}
                totalQuestions={questions.length}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onFinish={() => setShowConfirmModal(true)}
                onAnswerSelect={handleAnswerSelect}
                selectedAnswers={selectedAnswers}
                onReviewMark={handleReviewMark}
                reviewStatus={reviewStatus}
              />
            </div>

            <div
              className={`lg:w-80 bg-white z-40 lg:z-auto
              fixed lg:static top-0 bottom-0 right-0 transition-transform
              transform
              ${
                screenWidth >= 1024
                  ? "translate-x-0"
                  : isMobileSidebarOpen
                  ? "translate-x-0"
                  : "translate-x-full"
              }`}
            >
              <div className="sticky top-6 p-4 sm:p-0">
                <Sidebar
                  totalQuestions={questions.length}
                  currentIndex={currentIndex}
                  selectedAnswers={selectedAnswers}
                  reviewStatus={reviewStatus}
                  onQuestionClick={(index) => setCurrentIndex(index)}
                />
              </div>
            </div>
          </div>
        </div>

        {showWarningModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="text-red-600 mb-4">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-center mb-4">
                Warning #{fullscreenWarnings + tabSwitchWarnings}
              </h3>
              <p className="text-gray-600 text-center mb-6">
                {tabSwitchWarnings > 0
                  ? "You have switched tabs. Please return to the test tab to continue."
                  : "You have exited fullscreen mode. Please return to fullscreen to continue the test."}
              </p>
              <button
                onClick={handleFullscreenReEntry}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Return to Fullscreen
              </button>
            </div>
          </div>
        )}

        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <h3 className="text-xl font-semibold text-center mb-4">
                Submit Assessment
              </h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to submit your assessment? This action
                cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    handleFinish();
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Confirm Submit"}
                </button>
              </div>
            </div>
          </div>
        )}

        <Dialog
          open={openDeviceRestrictionModal}
          onClose={handleDeviceRestrictionModalClose}
          aria-labelledby="device-restriction-modal-title"
          aria-describedby="device-restriction-modal-description"
        >
          <DialogTitle id="device-restriction-modal-title">{"Device Restriction"}</DialogTitle>
          <DialogContent>
            <DialogContent id="device-restriction-modal-description">
              This test cannot be taken on a mobile or tablet device.
            </DialogContent>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeviceRestrictionModalClose} color="primary">
              OK
            </Button>
          </DialogActions>
        </Dialog>

        {showNoiseWarningModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="text-red-600 mb-4">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-center mb-4">
                Noise Detected
              </h3>
              <p className="text-gray-600 text-center mb-6">
                Noise has been detected. Please ensure a quiet environment to continue the test.
              </p>
              <button
                onClick={() => setShowNoiseWarningModal(false)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        <FaceDetectionComponent contestId={contestId} onWarning={setFaceDetectionWarning} /> {/* Integrate the FaceDetectionComponent */}

        {faceDetectionWarning && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="text-red-600 mb-4">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-center mb-4">
                Face Detection Warning
              </h3>
              <p className="text-gray-600 text-center mb-6">
                {faceDetectionWarning}
              </p>
              <button
                onClick={() => setFaceDetectionWarning('')}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>

      <style>
        {`
          @media (max-width: 640px) {
            .question-nav {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0.5rem;
            }
            .question-nav .prev-button,
            .question-nav .next-button {
              order: 1;
            }
            .question-nav .finish-button {
              order: 3;
              margin-top: 0.5rem;
            }
          }
          @media (min-width: 641px) {
            .question-nav {
              display: flex;
              flex-direction: row;
              gap: 1rem;
            }
          }
        `}
      </style>
    </div>
  );
}
