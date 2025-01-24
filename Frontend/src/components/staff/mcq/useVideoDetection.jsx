import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaExclamationTriangle, FaUserSlash, FaUsers } from 'react-icons/fa';

const FaceDetectionComponent = ({ contestId, onWarning }) => {
    const videoRef = useRef(null);
    const [faceDetectionCount, setFaceDetectionCount] = useState(
        parseInt(sessionStorage.getItem(`FaceDetectionCount_${contestId}`)) || 0
    );
    const [isKicked, setIsKicked] = useState(false);
    const [lastFaceDetectionTime, setLastFaceDetectionTime] = useState(Date.now());
    const [icon, setIcon] = useState(<FaCheckCircle size={50} color="gray" />);
    const [isIndicatorRed, setIsIndicatorRed] = useState(false);
    const navigate = useNavigate();

    const isProcessingWarning = useRef(false);
    const DEBOUNCE_TIME = 1000; // 1 second between warnings

    useEffect(() => {
        setupFaceDetection();
    }, [contestId]);

    const setupFaceDetection = async () => {
        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
            await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
            await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
            await faceapi.nets.faceExpressionNet.loadFromUri('/models');
            console.log('Models loaded successfully');

            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(error => {
                    console.error('Error playing video:', error);
                });
            }
        } catch (error) {
            console.error('Error setting up face detection:', error);
        }
    };

    useEffect(() => {
        const videoElement = videoRef.current;
        if (videoElement) {
            videoElement.addEventListener('loadedmetadata', () => {
                console.log('Video metadata loaded');
                const displaySize = { width: videoElement.videoWidth, height: videoElement.videoHeight };

                const interval = setInterval(async () => {
                    if (videoElement.readyState === 4) {
                        const detections = await faceapi.detectAllFaces(
                            videoElement,
                            new faceapi.TinyFaceDetectorOptions({
                                inputSize: 224,
                                scoreThreshold: 0.3
                            })
                        ).withFaceLandmarks().withFaceExpressions();

                        console.log('Detections:', detections);

                        handleFaceDetection(detections);
                    }
                }, 100);

                return () => clearInterval(interval);
            });
        }
    }, []);

    const handleFaceDetection = (detections) => {
        if (detections.length === 1) {
            const eyeDetection = checkEyeballDetection(detections[0].landmarks.positions);
            if (eyeDetection) {
                setIcon(<FaCheckCircle size={50} color="green" />);
                setIsIndicatorRed(false);
            } else {
                setIcon(<FaExclamationTriangle size={50} color="red" />);
                setIsIndicatorRed(true);
            }
        } else if (detections.length === 0) {
            setIcon(<FaUserSlash size={50} color="red" />);
            setIsIndicatorRed(true);
        } else if (detections.length > 1) {
            setIcon(<FaUsers size={50} color="red" />);
            setIsIndicatorRed(true);
        } else {
            const faceOrientation = checkFaceOrientation(detections[0].landmarks.positions, videoRef.current);
            if (!faceOrientation) {
                setIcon(<FaExclamationTriangle size={50} color="red" />);
                setIsIndicatorRed(true);
            }
        }
    };

    useEffect(() => {
        if (isIndicatorRed) {
            debounceFaceDetection();
        }
    }, [isIndicatorRed]);

    const debounceFaceDetection = () => {
        const currentTime = Date.now();
        if (currentTime - lastFaceDetectionTime >= DEBOUNCE_TIME && !isProcessingWarning.current) {
            setLastFaceDetectionTime(currentTime);
            isProcessingWarning.current = true;
            handleFaceDetectionCount();

            setTimeout(() => {
                isProcessingWarning.current = false;
            }, DEBOUNCE_TIME);
        }
    };

    const handleFaceDetectionCount = () => {
        setFaceDetectionCount((prevCount) => {
            const newCount = prevCount + 1;
            sessionStorage.setItem(`FaceDetectionCount_${contestId}`, newCount);

            if (newCount <= 5) {
                onWarning(`${newCount === 1 ? "First" : newCount === 2 ? "Second" : newCount === 3 ? "Third" : `${newCount}th`} Warning: Face detection issue detected!`);
            }

            if (newCount === 5) {
                onWarning(`Eleventh Warning: You have been kicked out!`);
                setIsKicked(true);
            }

            return newCount;
        });
    };

    const checkFaceOrientation = (landmarks, video) => {
        const noseTip = landmarks[30];
        const leftEyeCenter = calculateEyeCenter(landmarks.slice(36, 42));
        const rightEyeCenter = calculateEyeCenter(landmarks.slice(42, 48));

        const eyeCenterX = (leftEyeCenter.x + rightEyeCenter.x) / 2;

        const orientationThreshold = 0.015;
        const orientation = Math.abs(noseTip.x - eyeCenterX) < orientationThreshold * video.videoWidth;
        return orientation;
    };

    const calculateEyeCenter = (eyeLandmarks) => {
        const x = eyeLandmarks.reduce((sum, landmark) => sum + landmark.x, 0) / eyeLandmarks.length;
        const y = eyeLandmarks.reduce((sum, landmark) => sum + landmark.y, 0) / eyeLandmarks.length;
        return { x, y };
    };

    const checkEyeballDetection = (landmarks) => {
        const leftEyeLandmarks = landmarks.slice(36, 42);
        const rightEyeLandmarks = landmarks.slice(42, 48);

        const leftEyeDetected = leftEyeLandmarks.every(landmark => landmark.x > 0 && landmark.y > 0);
        const rightEyeDetected = rightEyeLandmarks.every(landmark => landmark.x > 0 && landmark.y > 0);

        return leftEyeDetected && rightEyeDetected;
    };

    useEffect(() => {
        if (isKicked) {
            sessionStorage.setItem('kickedOut', 'true');
            navigate('/studentdashboard');
        }
    }, [isKicked, navigate]);

    return (
        <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 1000, display: 'flex', alignItems: 'center' }}>
            <video ref={videoRef} style={{ display: 'none' }} autoPlay muted />
            {icon}
        </div>
    );
};

export default FaceDetectionComponent;
