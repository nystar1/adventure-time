import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function FreedomWeekUpload() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [participantEmails, setParticipantEmails] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [recordId, setRecordId] = useState("");

  const [currentStep, setCurrentStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isUnlocked, setIsUnlocked] = useState(false);

  const breadcrumbItems = [
    { label: "Adventure Time", href: "/" },
    { label: "Neighborhood", href: "/neighborhood" },
    { label: "Freedom Week Upload", href: "/neighborhood/freedom-upload" }
  ];

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      
      if (now.getMonth() === 6 && now.getDate() === 4) { 
        window.location.href = "https://youtu.be/FqxJ_iuBPCs?list=RDFqxJ_iuBPCs";
        return;
      }
      
      const targetDate = new Date('2025-07-05T07:00:00Z');
      
      const difference = targetDate - now;
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeLeft({ days, hours, minutes, seconds });
        setIsUnlocked(false);
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsUnlocked(true);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  const sendOtp = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/sendOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send OTP");
      setCurrentStep(2);
      setStatus({ type: "success", message: "OTP sent to your email." });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/verifyOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data.message || "OTP verification failed");
      }
      setCurrentStep(3);
      setStatus({ type: "success", message: "OTP verified successfully. You can now upload your video." });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    if (!videoUrl || !participantEmails) {
      setStatus({ type: "error", message: "Please enter a YouTube video link and participant emails." });
      setLoading(false);
      return;
    }

    const emails = participantEmails.split(',').map(email => email.trim()).filter(email => email);
    if (emails.length !== 2) {
      setStatus({ type: "error", message: "Exactly 2 participant emails are required." });
      setLoading(false);
      return;
    }

    try {
      const createRes = await fetch("/api/freedomweek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", emails }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.message || "Failed to create record");

      const saveRes = await fetch("/api/freedomweek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveVideoUrl", recordId: createData.record.id, videoUrl }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.message || "Failed to save video link");

      setStatus({ type: "success", message: "YouTube video link saved successfully! Record created with both participant emails." });
      setVideoUrl("");
      setParticipantEmails("");
      setCurrentStep(1);
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setOtp("");
    setVideoFile(null);
    setParticipantEmails("");
    setVideoUrl("");
    setRecordId("");
    setCurrentStep(1);
    setStatus(null);
  };

  return (
    <>
      <Head>
        <title>Freedom Week Upload - Adventure Time</title>
        <meta name="description" content="Upload your Freedom Week group video" />
      </Head>
      <div>
        <Breadcrumbs items={breadcrumbItems} />
        <h1>Freedom Week Group Video Upload</h1>
        
        {/* Countdown Timer */}
        {!isUnlocked && (
          <div style={{ 
            textAlign: "center", 
            margin: "24px 0", 
            padding: "20px", 
            backgroundColor: "#f8f9fa", 
            borderRadius: "8px",
            border: "2px solid #007bff"
          }}>
            <h3>⏰ Freedom Week Upload Opens In:</h3>
            <div style={{ 
              display: "flex", 
              justifyContent: "center", 
              gap: "20px", 
              fontSize: "24px", 
              fontWeight: "bold",
              marginTop: "16px"
            }}>
              <div>
                <div style={{ fontSize: "36px", color: "#007bff" }}>{timeLeft.days}</div>
                <div style={{ fontSize: "14px", color: "#6c757d" }}>Days</div>
              </div>
              <div>
                <div style={{ fontSize: "36px", color: "#007bff" }}>{timeLeft.hours}</div>
                <div style={{ fontSize: "14px", color: "#6c757d" }}>Hours</div>
              </div>
              <div>
                <div style={{ fontSize: "36px", color: "#007bff" }}>{timeLeft.minutes}</div>
                <div style={{ fontSize: "14px", color: "#6c757d" }}>Minutes</div>
              </div>
              <div>
                <div style={{ fontSize: "36px", color: "#007bff" }}>{timeLeft.seconds}</div>
                <div style={{ fontSize: "14px", color: "#6c757d" }}>Seconds</div>
              </div>
            </div>
            <p style={{ marginTop: "16px", color: "#6c757d" }}>
              Upload opens on July 5th, 2025 at 12:00 AM PDT
            </p>
          </div>
        )}

        {isUnlocked && (
          <p>
            🎉 Freedom Week Upload is now open! Upload a group video from your computer. One person must verify via OTP. Exactly 2 participant emails are required.
          </p>
        )}

        {/* Step indicators - only show when unlocked */}
        {isUnlocked && (
          <div style={{ display: "flex", justifyContent: "center", margin: "24px 0" }}>
            <div style={{ 
              padding: "8px 16px", 
              margin: "0 8px", 
              borderRadius: "20px", 
              backgroundColor: currentStep >= 1 ? "#007bff" : "#e9ecef",
              color: currentStep >= 1 ? "white" : "#6c757d"
            }}>
              Step 1: Email
            </div>
            <div style={{ 
              padding: "8px 16px", 
              margin: "0 8px", 
              borderRadius: "20px", 
              backgroundColor: currentStep >= 2 ? "#007bff" : "#e9ecef",
              color: currentStep >= 2 ? "white" : "#6c757d"
            }}>
              Step 2: OTP
            </div>
            <div style={{ 
              padding: "8px 16px", 
              margin: "0 8px", 
              borderRadius: "20px", 
              backgroundColor: currentStep >= 3 ? "#007bff" : "#e9ecef",
              color: currentStep >= 3 ? "white" : "#6c757d"
            }}>
              Step 3: Upload
            </div>
          </div>
        )}

        {/* Form Steps - only show when unlocked */}
        {isUnlocked && (
          <>
            {/* Step 1: Email Input */}
            {currentStep === 1 && (
              <div style={{ maxWidth: "600px", marginTop: "24px" }}>
                <h3>Step 1: Enter your email to receive OTP</h3>
                <div style={{ marginBottom: "12px" }}>
                  <label>Email:</label><br />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ width: "100%", padding: "8px", marginBottom: "12px" }}
                  />
                </div>
                <button onClick={sendOtp} disabled={loading || !email}>
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
              </div>
            )}

            {/* Step 2: OTP Verification */}
            {currentStep === 2 && (
              <div style={{ maxWidth: "600px", marginTop: "24px" }}>
                <h3>Step 2: Enter the OTP sent to {email}</h3>
                <div style={{ marginBottom: "12px" }}>
                  <label>OTP:</label><br />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    style={{ width: "100%", padding: "8px", marginBottom: "12px" }}
                    placeholder="Enter the 6-digit code from your email"
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <button onClick={verifyOtp} disabled={loading || !otp}>
                    {loading ? "Verifying..." : "Verify OTP"}
                  </button>
                  <button 
                    onClick={() => setCurrentStep(1)} 
                    style={{ marginLeft: "8px", backgroundColor: "#6c757d" }}
                    disabled={loading}
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Video Upload */}
            {currentStep === 3 && (
              <form onSubmit={handleUpload} style={{ maxWidth: "600px", marginTop: "24px" }}>
                <h3>Step 3: Enter your YouTube video link</h3>
                <div style={{ marginBottom: "12px" }}>
                  <label>YouTube Video Link:</label><br />
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Paste YouTube video link here"
                    required
                    style={{ width: "100%", padding: "8px", marginBottom: "12px" }}
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label>Participant Emails (exactly two, comma-separated):</label><br />
                  <textarea
                    value={participantEmails}
                    onChange={(e) => setParticipantEmails(e.target.value)}
                    rows={3}
                    required
                    style={{ width: "100%", padding: "8px", marginBottom: "12px" }}
                    placeholder="email1@example.com, email2@example.com"
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <button type="submit" disabled={loading || !videoUrl || !participantEmails}>
                    {loading ? "Saving..." : "Save Video Link"}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setCurrentStep(2)} 
                    style={{ marginLeft: "8px", backgroundColor: "#6c757d" }}
                    disabled={loading}
                  >
                    Back
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* Status and Reset - only show when unlocked */}
        {isUnlocked && (
          <>
            {status && (
              <div style={{ 
                marginTop: "16px", 
                padding: "12px", 
                borderRadius: "4px",
                backgroundColor: status.type === "error" ? "#f8d7da" : "#d4edda",
                color: status.type === "error" ? "#721c24" : "#155724",
                border: `1px solid ${status.type === "error" ? "#f5c6cb" : "#c3e6cb"}`
              }}>
                {status.message}
              </div>
            )}

            {/* Reset button */}
            {currentStep > 1 && (
              <div style={{ marginTop: "24px" }}>
                <button onClick={resetForm} style={{ backgroundColor: "#dc3545" }}>
                  Start Over
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
