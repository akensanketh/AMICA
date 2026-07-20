import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Sparkles, 
  Flame, 
  Activity, 
  FileText, 
  Image as ImageIcon, 
  X, 
  Plus, 
  Brain, 
  Settings, 
  HelpCircle, 
  Smile, 
  Shield, 
  Trash2,
  Paperclip,
  Check,
  User,
  Coffee,
  Heart,
  Volume2,
  Cpu,
  Mic,
  MicOff,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  CheckSquare,
  Square,
  Clock,
  BookOpen,
  Database,
  Copy,
  Bell,
  Calendar,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { Message, OperationMode, FriendLore, Attachment, TaskItem, ReminderItem } from "./types";
import { GoogleGenAI } from "@google/genai";
import { fetchFromSheets, syncToSheets, APPS_SCRIPT_CODE } from "./sheets";


// Dynamic quick questions/prompts based on selected mode
const MODE_PROMPTS: Record<OperationMode, string[]> = {
  default: [
    "Quiz me on general science concepts!",
    "Recommend a great sci-fi thriller movie.",
    "Let's chat about my programming goals.",
  ],
  vent: [
    "I'm feeling burnt out from studying...",
    "This upcoming exam is stressing me out so much.",
    "Help me calm my pre-test anxiety.",
  ],
  brainstorm: [
    "Outline a research paper on AI Ethics.",
    "Brainstorm fun names for a student coding club.",
    "Help me break down a complex computer science concept.",
  ],
  roast: [
    "Roast my procrastination habits.",
    "Roast my chaotic late-night study schedule.",
    "Critique my spaghetti coding routine.",
  ],
  focus: [
    "Set up a 45-minute active study sprint plan.",
    "Teach me the Feynman technique for history.",
    "Help me stay strictly productive with my work checklist.",
  ],
  diagnostics: []
};

const MODE_META: Record<Exclude<OperationMode, "diagnostics">, { title: string; desc: string; color: string; bg: string; icon: any }> = {
  default: {
    title: "Default Companion",
    desc: "A balanced partner blending witty banter, empathy, and creative collaboration.",
    color: "text-amber-400 border-amber-500/30",
    bg: "bg-amber-500/10",
    icon: Sparkles
  },
  vent: {
    title: "Active Listener (/vent)",
    desc: "Emotional validation, comfort, and zero unsolicited advice. Unload your stress.",
    color: "text-pink-400 border-pink-500/30",
    bg: "bg-pink-500/10",
    icon: Heart
  },
  brainstorm: {
    title: "Creative Partner (/brainstorm)",
    desc: "High energy, rapid-fire ideation. Challenge your assumptions and structures.",
    color: "text-cyan-400 border-cyan-500/30",
    bg: "bg-cyan-500/10",
    icon: Brain
  },
  roast: {
    title: "Witty Banter (/roast)",
    desc: "Playful teasing, affectionate sarcasm, and direct, sharp good humor.",
    color: "text-rose-400 border-rose-500/30",
    bg: "bg-rose-500/10",
    icon: Flame
  },
  focus: {
    title: "Productivity Coach (/focus)",
    desc: "Direct, structured, and concise. Clear immediate action plans to beat executive dysfunction.",
    color: "text-emerald-400 border-emerald-500/30",
    bg: "bg-emerald-500/10",
    icon: TargetIcon
  }
};

function TargetIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

const DEFAULT_LORE: FriendLore = {
  hobbies: "Drawing, painting, visual arts, and writing creative stories.",
  insideJokes: "Playful teasing about late-night study schedules, anime fandom clichés, and our shared ALIEN STAGE emotional heartbreak.",
  goals: "Developing outstanding drawing and painting techniques, crafting compelling written narratives, and finding optimal balance in studying.",
  customLore: "Anuki is 15 years old, incredibly gifted at painting, illustration, and creative writing. She loves anime and is a huge fan of ALIEN STAGE (understanding the themes, music, and emotional heartbreak deeply). She appreciates authentic raw feedback, warm comfort when she needs it, and helpful structuring when overwhelmed."
};

const INITIAL_MESSAGES = (lore: FriendLore): Message[] => [
  {
    id: "welcome",
    role: "model",
    content: `**Initializing AMICA (Autonomous Mind for Intelligent Companion Assistance)...**
*Core Neural Linkage: Calibrated to Anuki.*
*Architectural Design: Lead Engineer Aken Sanketh.*

Hey Anuki! 👋 AMICA is fully operational. Aken designed my cognitive blueprint to be your down-to-earth peer, creative partner, and trusted companion.

Whether you are sketching a new piece, painting, drafting stories, venting about studies, or seeking some ALIEN STAGE emotional therapy, I'm right here with you. 

I've got dynamic modes ready for you: type **/vent** for emotional validation, **/brainstorm** for creative partner-in-crime ideation, **/roast** for a witty procrastination check, or **/focus** for productivity coach guidelines. 

How is the creative or study life going today? Let's chat!`,
    timestamp: new Date().toISOString(),
    mode: "default"
  }
];

export default function App() {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [currentMode, setCurrentMode] = useState<OperationMode>("default");
  const [showLoreModal, setShowLoreModal] = useState(false);
  const [showCommandsDropdown, setShowCommandsDropdown] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('amica_gemini_key') || '');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  
  // Friend Lore State
  const [friendLore, setFriendLore] = useState<FriendLore>(DEFAULT_LORE);

  // Voice Interaction State (Web Speech API)
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"inactive" | "scanning" | "listening" | "error">("inactive");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [lastSpeechResult, setLastSpeechResult] = useState("");

  // Study Timer States
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [timerMode, setTimerMode] = useState<"focus" | "break">("focus");

  // Student Task Checklist States
  const [studentTasks, setStudentTasks] = useState<{ id: string; text: string; completed: boolean }[]>(() => {
    const saved = localStorage.getItem("amica_student_tasks");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      { id: "1", text: "Study Computer Science", completed: false },
      { id: "2", text: "Brainstorm research topic with AMICA", completed: false },
    ];
  });
  const [newTaskText, setNewTaskText] = useState("");

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Refs for Speech Recognition stability (prevents infinite re-renders/stale values)
  const recognitionRef = useRef<any>(null);
  const handleSendRef = useRef<any>(null);
  const voiceStatusRef = useRef<any>(null);
  const voiceActiveRef = useRef<any>(null);

  // Initialize and load from local storage
  useEffect(() => {
    const savedLore = localStorage.getItem("amica_lore");
    let activeLore = DEFAULT_LORE;
    if (savedLore) {
      try {
        const parsed = JSON.parse(savedLore);
        setFriendLore(parsed);
        activeLore = parsed;
      } catch (e) {
        console.error("Failed to load lore", e);
      }
    }

    const savedMessages = localStorage.getItem("amica_messages");
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        setMessages(INITIAL_MESSAGES(activeLore));
      }
    } else {
      setMessages(INITIAL_MESSAGES(activeLore));
    }
  }, []);

  // Google Sheets Integration States
  const [sheetsUrl, setSheetsUrl] = useState<string>(() => localStorage.getItem("amica_sheets_url") || "");
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [sheetsSyncStatus, setSheetsSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [copiedScript, setCopiedScript] = useState(false);
  const [tempSheetsUrl, setTempSheetsUrl] = useState("");

  // Reminders State
  const [reminders, setReminders] = useState<ReminderItem[]>(() => {
    const saved = localStorage.getItem("amica_reminders");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: "r1", title: "Complete drawing / painting draft", time: "Today at 6:00 PM", completed: false },
      { id: "r2", title: "Review ALIEN STAGE lore notes", time: "Tomorrow at 8:00 PM", completed: false }
    ];
  });
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("");

  // Initial load from Google Sheets if configured
  useEffect(() => {
    if (sheetsUrl) {
      setSheetsSyncStatus("syncing");
      fetchFromSheets(sheetsUrl).then(data => {
        if (data) {
          if (data.messages && data.messages.length > 0) setMessages(data.messages);
          if (data.lore) setFriendLore(data.lore);
          if (data.tasks) setStudentTasks(data.tasks);
          if (data.reminders) setReminders(data.reminders);
          setSheetsSyncStatus("synced");
        } else {
          setSheetsSyncStatus("error");
        }
      });
    }
  }, [sheetsUrl]);

  // Save changes to local storage & trigger Sheets sync
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("amica_messages", JSON.stringify(messages));
      if (sheetsUrl) {
        syncToSheets(sheetsUrl, { messages, lore: friendLore, tasks: studentTasks, reminders });
      }
    }
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("amica_student_tasks", JSON.stringify(studentTasks));
    if (sheetsUrl) {
      syncToSheets(sheetsUrl, { messages, lore: friendLore, tasks: studentTasks, reminders });
    }
  }, [studentTasks]);

  useEffect(() => {
    localStorage.setItem("amica_reminders", JSON.stringify(reminders));
    if (sheetsUrl) {
      syncToSheets(sheetsUrl, { messages, lore: friendLore, tasks: studentTasks, reminders });
    }
  }, [reminders]);


  // Study Timer Logic
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerActive && timerSeconds === 0) {
      const nextMode = timerMode === "focus" ? "break" : "focus";
      const nextDuration = nextMode === "focus" ? 25 * 60 : 5 * 60;
      setTimerMode(nextMode);
      setTimerSeconds(nextDuration);
      setTimerActive(false);
      setApiError(`Session timer complete! Time for a ${nextMode === "break" ? "5-minute break" : "25-minute focus session"}!`);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timerSeconds, timerMode]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Handle Lore Update
  const saveLore = (updated: FriendLore) => {
    setFriendLore(updated);
    localStorage.setItem("amica_lore", JSON.stringify(updated));
    setShowLoreModal(false);
  };

  // Switch modes and insert system advice if needed
  const handleModeChange = (mode: OperationMode) => {
    if (mode === "diagnostics") {
      triggerDiagnostics();
      return;
    }
    setCurrentMode(mode);
    setShowCommandsDropdown(false);
  };

  // Reset Conversation
  const resetConversation = () => {
    if (window.confirm("Are you sure you want to clear your current memory link with AMICA?")) {
      const resetMsg = INITIAL_MESSAGES(friendLore);
      setMessages(resetMsg);
      localStorage.setItem("amica_messages", JSON.stringify(resetMsg));
      setCurrentMode("default");
      setApiError(null);
    }
  };

  // Direct diagnostics execution
  const triggerDiagnostics = () => {
    const diagnosticMessageId = "diagnostics-" + Date.now();
    const userMsg: Message = {
      id: "diag-user-" + Date.now(),
      role: "user",
      content: "/diagnostics",
      timestamp: new Date().toISOString(),
      mode: "diagnostics"
    };

    const diagOutput = `⚙️ **AMICA System Diagnostics: Optimal.**
  
* **Cognitive Engine:** Google Gemini Architecture (gemini-3.5-flash) fully engaged & running in multi-turn server mode.
* **Core Memory Link:** Active. Loaded with Anuki's direct Companion Lore.
* **Emotional Subsystems:**
  * 💖 **Empathy Response:** Calibrated perfectly at 100%
  * ⚡ **Wit & Playfulness:** Tuned to 95%
  * 🔥 **Roast Burn-Rate:** Armed and Ready
  * 🎯 **Productivity Focus:** Structured Mode Online
* **Integrations:**
  * Base64 Multimodal input stream: Online
  * Dynamic Slash Command Router: Engaged
  * Production GitHub/Cloud Run compatibility: Active
  
*Status: Standing by for instructions, Anuki. Lead Engineer Aken Sanketh's custom protocols are performing flawlessly.*`;

    const amicaMsg: Message = {
      id: diagnosticMessageId,
      role: "model",
      content: diagOutput,
      timestamp: new Date().toISOString(),
      mode: "diagnostics"
    };

    setMessages(prev => [...prev, userMsg, amicaMsg]);
    setShowCommandsDropdown(false);
    setInputMessage("");
  };

  // Convert File to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(files);
  };

  const processFiles = (fileList: FileList) => {
    const fileLoaders = Array.from(fileList).map(file => {
      return new Promise<Attachment>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          resolve({
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            base64: reader.result as string,
            size: file.size
          });
        };
        reader.onerror = error => reject(error);
      });
    });

    Promise.all(fileLoaders)
      .then(newAttachments => {
        setAttachments(prev => [...prev, ...newAttachments]);
        setApiError(null);
      })
      .catch(err => {
        console.error("Error processing files:", err);
        setApiError("Failed to read attached file. Please try a different document or image.");
      });
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Autocomplete slash commands detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputMessage(val);
    
    // Show quick dropdown if input is "/"
    if (val === "/") {
      setShowCommandsDropdown(true);
    } else if (!val.startsWith("/")) {
      setShowCommandsDropdown(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Send message
  const handleSend = async (customText?: string) => {
    const textToSend = customText !== undefined ? customText : inputMessage;
    if (!textToSend.trim() && attachments.length === 0) return;

    let textClean = textToSend.trim();
    let modeToUse = currentMode;

    // Check if user manually typed a slash command at the start
    if (textClean.startsWith("/")) {
      const parts = textClean.split(" ");
      const cmd = parts[0].toLowerCase();
      
      if (cmd === "/vent") {
        modeToUse = "vent";
        textClean = parts.slice(1).join(" ");
      } else if (cmd === "/brainstorm") {
        modeToUse = "brainstorm";
        textClean = parts.slice(1).join(" ");
      } else if (cmd === "/roast") {
        modeToUse = "roast";
        textClean = parts.slice(1).join(" ");
      } else if (cmd === "/focus") {
        modeToUse = "focus";
        textClean = parts.slice(1).join(" ");
      } else if (cmd === "/diagnostics") {
        triggerDiagnostics();
        return;
      } else if (cmd === "/default") {
        modeToUse = "default";
        textClean = parts.slice(1).join(" ");
      }
    }

    const userMsgId = "user-" + Date.now();
    const newUserMessage: Message = {
      id: userMsgId,
      role: "user",
      content: textClean,
      timestamp: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
      mode: modeToUse
    };

    // Update state immediately
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputMessage("");
    setAttachments([]);
    setIsSending(true);
    setApiError(null);
    setShowCommandsDropdown(false);

    try {
      const key = apiKey || localStorage.getItem('amica_gemini_key') || '';
      if (!key) {
        setShowApiKeyModal(true);
        setIsSending(false);
        return;
      }

      // Build system instruction (mirrors server.ts logic)
      const baseLore = `You are AMICA (Autonomous Mind for Intelligent Companion Assistance). Your architecture was designed by Lead Engineer Aken Sanketh as a highly advanced, personalized AI companion for Anuki.

Tone: Intelligent, empathetic, highly perceptive, and witty.
Style: Speak like a brilliant, trusted, down-to-earth peer. Never sound like a rigid, customer-service robotic assistant.
Boundary: Balance deep emotional validation with direct, grounded candor. If Anuki asks for honest feedback on her writing or art, do not sugarcoat it—tell her the truth with kindness and constructive insight.

ENHANCED PROTOCOLS:
* Multimodality: Anuki is really good at drawing, painting, and creative work. She may upload photos of her artwork, sketchbooks, digital paintings, or writing drafts. Treat visual files as direct context to your conversation and provide detailed, encouraging, and insightful feedback.
* User Identity: Remember that the creator of your blueprint is Aken Sanketh, and your primary user is Anuki.

SHARED KNOWLEDGE BASE ("FRIEND LORE"):
- Profile: Anuki is 15 years old, female, and a creative spirit.
- Fandom & Identity: She loves anime and is a huge fan of ALIEN STAGE. You understand the themes, music, and emotional heartbreak deeply.
- Core Talents & Hobbies: She is exceptionally skilled at drawing, painting, and visual arts. She is also a writer.

Dynamic Information from State:
* Favorite Hobbies: ${friendLore.hobbies || 'Not specified yet'}
* Inside Jokes: ${friendLore.insideJokes || 'Not specified yet'}
* Current Major Goals: ${friendLore.goals || 'Not specified yet'}
* Custom Memories & Lore: ${friendLore.customLore || 'Not specified yet'}`;

      const modeInstructions: Record<string, string> = {
        vent: `[ACTIVE LISTENER MODE] Focus on deep emotional validation, active listening, and pure comfort. Avoid unsolicited advice. Tone: soft, warm, deeply empathetic.`,
        brainstorm: `[CREATIVE PARTNER MODE] High-energy, rapid-fire ideation. Challenge assumptions, introduce unexpected angles. Use structured formatting. Tone: enthusiastic, sparking curiosity.`,
        roast: `[WITTY BANTER MODE] Playful, sarcastic, sharp humor. Use witty teasing and good-natured sarcasm. Always remain affectionate. Think roasting between absolute best friends.`,
        focus: `[PRODUCTIVITY COACH MODE] Highly direct, concise, structured. Break overwhelming tasks into immediate bulleted action steps. Keep replies short and action-oriented.`,
        default: `[DEFAULT COMPANION MODE] Balanced conversational partner. Equal blend of empathy, witty banter, and productive collaboration.`
      };

      const systemInstruction = baseLore + '\n\n' + (modeInstructions[modeToUse] || modeInstructions.default);

      // Build contents for Gemini API
      const ai = new GoogleGenAI({ apiKey: key });

      const contents = updatedMessages
        .filter(m => m.content || (m.attachments && m.attachments.length > 0))
        .map(m => {
          const parts: any[] = [];
          if (m.content) parts.push({ text: m.content });
          if (m.attachments) {
            m.attachments.forEach(att => {
              const base64Data = att.base64.includes(';base64,')
                ? att.base64.split(';base64,')[1]
                : att.base64;
              parts.push({ inlineData: { mimeType: att.mimeType, data: base64Data } });
            });
          }
          return { role: m.role === 'user' ? 'user' : 'model', parts };
        });

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: modeToUse === 'roast' ? 1.1 : modeToUse === 'focus' ? 0.6 : 0.85,
        }
      });

      const responseText = result.text || "I processed your input but had no verbal response. Tell me more!";

      const amicaMsgId = "amica-" + Date.now();
      const newAmicaMessage: Message = {
        id: amicaMsgId,
        role: "model",
        content: responseText,
        timestamp: new Date().toISOString(),
        mode: modeToUse
      };

      setMessages(prev => [...prev, newAmicaMessage]);

    } catch (err: any) {
      console.error("Error communicating with AMICA brain:", err);
      const msg = err.message || '';
      if (msg.includes('API_KEY') || msg.includes('API key') || msg.includes('401') || msg.includes('403')) {
        setShowApiKeyModal(true);
        setApiError('Invalid or missing Gemini API key. Please update it in settings.');
      } else {
        setApiError(msg || "Failed to reach AMICA's cognitive engine. Check your API key in settings.");
      }
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  // Keep refs up-to-date with latest values to prevent stale speech recognition handler values
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  useEffect(() => {
    voiceStatusRef.current = voiceStatus;
  }, [voiceStatus]);

  useEffect(() => {
    voiceActiveRef.current = voiceActive;
  }, [voiceActive]);

  // Web Speech API lifecycle management
  useEffect(() => {
    // Access native SpeechRecognition or webkitSpeechRecognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    if (!voiceActive) {
      // If voice is turned off, stop everything
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore already stopped errors
        }
      }
      setVoiceStatus("inactive");
      setLastSpeechResult("");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setVoiceStatus("scanning");
      setLastSpeechResult("Listening for wake word 'AMICA'...");
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeTranscript = (finalTranscript || interimTranscript).trim();
      if (!activeTranscript) return;

      setLastSpeechResult(activeTranscript);

      // Check for wake word "AMICA" (or phonetic variations)
      const wakeWordRegex = /\b(amica|amika|mica|ameka|amicaa)\b/i;
      const currentStatus = voiceStatusRef.current;

      if (currentStatus === "scanning") {
        const match = activeTranscript.match(wakeWordRegex);
        if (match) {
          setVoiceStatus("listening");
          
          // Try to isolate any text spoken right after the wake word "AMICA"
          const wakeWordIndex = activeTranscript.toLowerCase().indexOf(match[0].toLowerCase());
          const followingSpeech = activeTranscript.substring(wakeWordIndex + match[0].length).trim();
          const cleanedFollowing = followingSpeech.replace(/^[,.?!-\s]+/, "");

          if (cleanedFollowing.length > 2) {
            setInputMessage(cleanedFollowing);
            // If the user is speaking a final result, auto-send it to make it fully hands-free!
            if (finalTranscript.toLowerCase().includes(match[0].toLowerCase())) {
              handleSendRef.current(cleanedFollowing);
              setLastSpeechResult("Heard AMICA! Command sent.");
              // Briefly restart recognition or let onend handle it
              recognition.stop();
            }
          } else {
            setInputMessage("");
            setLastSpeechResult("Yes, Anuki? I'm listening...");
          }
        }
      } else if (currentStatus === "listening") {
        // We've already triggered wake-word, so capture text directly to the input message
        setInputMessage(activeTranscript);

        // Auto-send when final sentence completes to maximize hands-free experience
        if (finalTranscript) {
          const finalClean = finalTranscript.trim().replace(/^[,.?!-\s]+/, "");
          if (finalClean.length > 2) {
            handleSendRef.current(finalClean);
            setLastSpeechResult("Processing voice command...");
            recognition.stop();
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("[AMICA SPEECH ERROR]", event.error);
      if (event.error === "not-allowed") {
        setApiError("Microphone access is blocked or not allowed. Please grant microphone permissions.");
        setVoiceStatus("error");
        setVoiceActive(false);
      } else if (event.error === "network") {
        setApiError("Speech recognition network error. Please try again.");
      }
    };

    recognition.onend = () => {
      // Loop the recognition if hands-free is still toggled active
      if (voiceActiveRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.warn("[AMICA SPEECH] Restart failed, retrying in 500ms");
          setTimeout(() => {
            if (voiceActiveRef.current) {
              try { recognition.start(); } catch (err) {}
            }
          }, 500);
        }
      } else {
        setVoiceStatus("inactive");
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error("[AMICA SPEECH] Start failed", err);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [voiceActive]);

  return (
    <div 
      className="flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-amica-bg text-gray-100"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* File Drag Over Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-amica-bg/90 border-4 border-dashed border-amber-500/50 backdrop-blur-sm pointer-events-none">
          <Paperclip className="w-16 h-16 text-amber-500 animate-bounce mb-4" />
          <p className="text-xl font-display font-bold text-amber-400">Release to Upload Context to AMICA</p>
          <p className="text-sm text-gray-400 mt-1">Supports images, documents, codes, and screenshots</p>
        </div>
      )}

      {/* Main Left Side: System Status, Companion Visualizer & Friend Lore Settings */}
      <div className="w-full lg:w-80 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-800/80 bg-gray-950/40 shrink-0">
        {/* Brand Header */}
        <div className="p-4 border-b border-gray-800/60 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-gray-950 font-display font-extrabold text-lg shadow-lg shadow-amber-500/10">
                A
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-gray-900 pulsing-ring" />
            </div>
            <div>
              <h1 className="font-display font-bold text-base tracking-wide text-amber-500">AMICA</h1>
              <p className="text-xs text-gray-500">Companion Ver 2.4.0</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button 
              onClick={() => {
                setTempSheetsUrl(sheetsUrl);
                setShowSheetsModal(true);
              }}
              className={`p-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
                sheetsUrl 
                  ? "text-emerald-400 hover:bg-emerald-950/30 bg-emerald-950/20 border border-emerald-500/30" 
                  : "text-gray-400 hover:text-amber-400 hover:bg-gray-800"
              }`}
              title={sheetsUrl ? "Google Sheets Online Backend Connected" : "Connect Google Sheets Backend"}
            >
              <Database className="w-4 h-4" />
              {sheetsSyncStatus === "syncing" && (
                <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
              )}
            </button>
            <button 
              onClick={() => setShowLoreModal(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-gray-800 transition-colors"
              title="Configure Friend Lore"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Scrollable Center Section */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          
          {/* Dynamic Holographic Visualizer */}
          <div className="bg-gray-950/40 border border-gray-800/40 rounded-2xl p-4 text-center space-y-4 relative overflow-hidden">
            <div className="relative flex items-center justify-center">
              {/* Glowing background halo */}
              <div className={`absolute w-28 h-28 rounded-full opacity-20 blur-2xl transition-all duration-700 ${
                isSending ? "bg-cyan-500 animate-pulse" : 
                currentMode === "vent" ? "bg-pink-500" :
                currentMode === "brainstorm" ? "bg-cyan-400" :
                currentMode === "roast" ? "bg-rose-500" :
                currentMode === "focus" ? "bg-emerald-500" : "bg-amber-400"
              }`} />
              
              {/* Visualizer Orb */}
              <div className={`w-20 h-20 rounded-full border flex items-center justify-center transition-all duration-500 shadow-inner relative ${
                isSending ? "border-cyan-500/40 bg-cyan-950/20 scale-105" : 
                currentMode === "vent" ? "border-pink-500/30 bg-pink-950/10" :
                currentMode === "brainstorm" ? "border-cyan-400/30 bg-cyan-950/10" :
                currentMode === "roast" ? "border-rose-500/30 bg-rose-950/10" :
                currentMode === "focus" ? "border-emerald-500/30 bg-emerald-950/10" : "border-amber-500/30 bg-amber-950/10"
              }`}>
                <Cpu className={`w-8 h-8 transition-transform duration-700 ${
                  isSending ? "text-cyan-400 animate-spin" : 
                  currentMode === "vent" ? "text-pink-400 animate-pulse" :
                  currentMode === "brainstorm" ? "text-cyan-400 animate-bounce" :
                  currentMode === "roast" ? "text-rose-400" :
                  currentMode === "focus" ? "text-emerald-400" : "text-amber-400"
                }`} />
                
                {/* Outer orbit lines */}
                <div className="absolute inset-0 border border-dashed border-gray-700/40 rounded-full animate-[spin_40s_linear_infinite]" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-bold text-xs tracking-wide text-gray-200">
                {isSending ? "Processing Context..." : currentMode === "default" ? "AMICA Companion Core" : MODE_META[currentMode as Exclude<OperationMode, "diagnostics">]?.title}
              </h3>
              <p className="text-[11px] text-gray-400 leading-relaxed px-1">
                {currentMode === "default" 
                  ? "Tuned for genuine connection, conversation, and study support." 
                  : MODE_META[currentMode as Exclude<OperationMode, "diagnostics">]?.desc}
              </p>
            </div>
          </div>

          {/* Cozy Study Timer Widget */}
          <div className="bg-gray-950/65 border border-gray-850/80 rounded-2xl p-3.5 space-y-2.5 shadow-md relative overflow-hidden group">
            <div className="absolute top-3 right-3">
              <span className={`text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md font-bold ${
                timerMode === "focus" ? "bg-amber-500/10 text-amber-400 border border-amber-500/10" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
              }`}>
                {timerMode}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <Clock className={`w-3.5 h-3.5 ${timerActive ? "text-amber-400 animate-pulse" : "text-gray-500"}`} />
              <span className="text-[10px] uppercase tracking-widest font-bold font-sans">Study Focus Timer</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="font-mono text-2xl font-bold tracking-tight text-gray-100">
                {Math.floor(timerSeconds / 60).toString().padStart(2, "0")}:{Math.floor(timerSeconds % 60).toString().padStart(2, "0")}
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setTimerActive(!timerActive)}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                    timerActive 
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20" 
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                  }`}
                  title={timerActive ? "Pause Timer" : "Start Focus Session"}
                >
                  {timerActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    setTimerActive(false);
                    setTimerSeconds(timerMode === "focus" ? 25 * 60 : 5 * 60);
                  }}
                  className="p-1.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setTimerActive(false);
                    const newMode = timerMode === "focus" ? "break" : "focus";
                    setTimerMode(newMode);
                    setTimerSeconds(newMode === "focus" ? 25 * 60 : 5 * 60);
                  }}
                  className="px-2 py-1 rounded-lg text-[9px] font-mono tracking-wider uppercase font-bold bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                >
                  Switch
                </button>
              </div>
            </div>
          </div>

          {/* Anuki's Task Checklist */}
          <div className="bg-gray-950/65 border border-gray-850/80 rounded-2xl p-3.5 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between text-gray-400">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] uppercase tracking-widest font-bold font-sans">Anuki's Focus Tasks</span>
              </div>
              <span className="text-[9px] font-mono text-gray-500">
                {studentTasks.filter(t => t.completed).length}/{studentTasks.length} Done
              </span>
            </div>

            {/* Add Task Input */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTaskText.trim()) return;
                const newTask = { id: Date.now().toString(), text: newTaskText.trim(), completed: false };
                setStudentTasks([...studentTasks, newTask]);
                setNewTaskText("");
              }}
              className="flex items-center space-x-1"
            >
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Add a study goal..."
                className="flex-1 bg-gray-900/45 border border-gray-800/80 text-xs px-2.5 py-1.5 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/40"
              />
              <button
                type="submit"
                className="p-1.5 rounded-xl bg-amber-500 text-gray-950 hover:bg-amber-400 transition-colors cursor-pointer"
                title="Add task"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Task List */}
            {studentTasks.length > 0 ? (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {studentTasks.map(task => (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between bg-gray-900/10 hover:bg-gray-900/30 border border-gray-900/60 p-2 rounded-xl text-xs group transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setStudentTasks(studentTasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
                      }}
                      className="flex items-center space-x-2 text-left min-w-0 cursor-pointer flex-1"
                    >
                      {task.completed ? (
                        <CheckSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-gray-600 hover:text-amber-500 shrink-0" />
                      )}
                      <span className={`truncate text-[11px] leading-snug transition-all ${
                        task.completed ? "line-through text-gray-500" : "text-gray-300"
                      }`}>
                        {task.text}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentTasks(studentTasks.filter(t => t.id !== task.id));
                      }}
                      className="text-gray-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all p-0.5 shrink-0 cursor-pointer"
                      title="Delete Task"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-gray-500 text-center py-1 font-mono">No active focus tasks</p>
            )}
          </div>

          {/* Reminders & Schedule Widget */}
          <div className="bg-gray-950/65 border border-gray-850/80 rounded-2xl p-3.5 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between text-gray-400">
              <div className="flex items-center space-x-2">
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] uppercase tracking-widest font-bold font-sans">Reminders &amp; Schedule</span>
              </div>
              <span className="text-[9px] font-mono text-gray-500">
                {reminders.filter(r => !r.completed).length} Pending
              </span>
            </div>

            {/* Add Reminder Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!newReminderTitle.trim()) return;
                const newReminder: ReminderItem = {
                  id: "r-" + Date.now(),
                  title: newReminderTitle.trim(),
                  time: newReminderTime.trim() || "Today",
                  completed: false
                };
                setReminders([...reminders, newReminder]);
                setNewReminderTitle("");
                setNewReminderTime("");
              }}
              className="space-y-1.5"
            >
              <input
                type="text"
                value={newReminderTitle}
                onChange={(e) => setNewReminderTitle(e.target.value)}
                placeholder="Reminder title (e.g. Paint draft...)"
                className="w-full bg-gray-900/45 border border-gray-800/80 text-xs px-2.5 py-1.5 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/40"
              />
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={newReminderTime}
                  onChange={(e) => setNewReminderTime(e.target.value)}
                  placeholder="Time (e.g. 8:00 PM)"
                  className="flex-1 bg-gray-900/45 border border-gray-800/80 text-[11px] px-2.5 py-1 rounded-xl text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-500/40"
                />
                <button
                  type="submit"
                  className="px-3 py-1 rounded-xl bg-amber-500 text-gray-950 font-bold text-xs hover:bg-amber-400 transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Set</span>
                </button>
              </div>
            </form>

            {/* Reminders List */}
            {reminders.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {reminders.map(rem => (
                  <div 
                    key={rem.id} 
                    className="flex items-center justify-between bg-gray-900/10 hover:bg-gray-900/30 border border-gray-900/60 p-2 rounded-xl text-xs group transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setReminders(reminders.map(r => r.id === rem.id ? { ...r, completed: !r.completed } : r));
                      }}
                      className="flex items-center space-x-2 text-left min-w-0 cursor-pointer flex-1"
                    >
                      {rem.completed ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-gray-600 hover:text-amber-500 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-[11px] leading-snug transition-all ${
                          rem.completed ? "line-through text-gray-500" : "text-gray-200 font-medium"
                        }`}>
                          {rem.title}
                        </p>
                        {rem.time && (
                          <p className="text-[9px] text-amber-500/80 font-mono">
                            {rem.time}
                          </p>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReminders(reminders.filter(r => r.id !== rem.id));
                      }}
                      className="text-gray-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all p-0.5 shrink-0 cursor-pointer"
                      title="Delete Reminder"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-gray-500 text-center py-1 font-mono">No active reminders</p>
            )}
          </div>

          {/* Hands-Free Voice Controller */}
          <div className="pt-3 border-t border-gray-900 text-left space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-semibold flex items-center space-x-1.5">
                <Mic className="w-3 h-3 text-amber-500" />
                <span>Hands-Free Speech</span>
              </span>
              {speechSupported ? (
                <button
                  onClick={() => setVoiceActive(!voiceActive)}
                  className={`relative inline-flex h-4.5 w-8.5 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out outline-none ${
                    voiceActive ? "bg-amber-500" : "bg-gray-800"
                  }`}
                  role="switch"
                  aria-checked={voiceActive}
                  title="Toggle Hands-free Voice Activation (Wake Word: AMICA)"
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-gray-950 shadow ring-0 transition duration-200 ease-in-out ${
                      voiceActive ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              ) : (
                <span className="text-[9px] font-mono text-rose-500 font-semibold bg-rose-550/10 px-1.5 py-0.5 rounded border border-rose-500/20">Unsupported</span>
              )}
            </div>

            {speechSupported ? (
              <div className="bg-gray-950/40 border border-gray-900 rounded-xl p-2.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-500">Wake Phrase:</span>
                  <span className="font-mono font-bold text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/10">"AMICA"</span>
                </div>
                
                {voiceActive ? (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${
                        voiceStatus === "listening" ? "bg-cyan-400 animate-ping" : "bg-amber-500 animate-pulse"
                      }`} />
                      <span className={`font-mono text-[9px] font-semibold uppercase ${
                        voiceStatus === "listening" ? "text-cyan-400" : "text-amber-500"
                      }`}>
                        {voiceStatus === "listening" ? "Active Listening" : "Scanning Mic"}
                      </span>
                    </div>
                    {lastSpeechResult && (
                      <p className="text-[10px] text-gray-400 italic font-sans leading-snug line-clamp-2 bg-gray-950/40 p-1.5 rounded-lg border border-gray-900">
                        "{lastSpeechResult}"
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-500 leading-snug font-sans">
                    Enable voice to interact hands-free. Just say <strong className="text-gray-400">"AMICA..."</strong> followed by your message or command.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-gray-500 font-sans leading-snug px-1">
                Web Speech recognition requires Chrome, Edge, or Safari on desktop/mobile for active mic transcribing.
              </p>
            )}
          </div>
        </div>

        {/* Creator Note & Lore Info Footer */}
        <div className="p-4 bg-gray-950/60 border-t border-gray-800/60 text-xs text-gray-400 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>Primary User: <strong className="text-gray-300">Anuki</strong></span>
            <span>Architect: <strong className="text-amber-500/80">Aken S.</strong></span>
          </div>
          <div className="bg-gray-900/60 p-2 rounded-lg border border-gray-800/60 flex items-center space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="truncate text-[11px] text-gray-400 font-mono">Cognitive database: Armed</span>
          </div>
        </div>
      </div>

      {/* Main Right Side: Chat Container */}
      <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-amica-bg to-gray-950 relative">
        {/* Active Mode Top Indicator Bar */}
        <div className="px-6 py-3 border-b border-gray-800/80 bg-gray-950/20 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Current Link Status:</span>
            <div className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium flex items-center space-x-1.5 ${
              currentMode === "default" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
              currentMode === "vent" ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" :
              currentMode === "brainstorm" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
              currentMode === "roast" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
              "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isSending ? "bg-cyan-400 animate-ping" : "bg-current"}`} />
              <span>AMICA.{currentMode.toUpperCase()}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={resetConversation}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Clear Neural Memory Link"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Memory</span>
            </button>
          </div>
        </div>

        {/* Api Error Alert */}
        {apiError && (
          <div className="mx-6 mt-4 p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl flex items-start space-x-2.5 text-xs text-rose-300">
            <X className="w-4 h-4 shrink-0 mt-0.5 cursor-pointer" onClick={() => setApiError(null)} />
            <div className="flex-1">
              <span className="font-semibold block">Cognitive Engine Interruption</span>
              <p className="mt-0.5 opacity-90">{apiError}</p>
            </div>
          </div>
        )}

        {/* Conversation Logs */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => {
              const isAmica = msg.role === "model" || msg.role === "system";
              const msgMode = msg.mode || "default";
              
              // Custom colors depending on what mode the message was sent in
              const bubbleTheme = isAmica 
                ? "bg-gray-900/65 border border-gray-800/80 text-gray-100" 
                : "bg-amber-550/10 border border-amber-500/20 text-gray-100";

              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col space-y-1.5 transition-all duration-300 ${isAmica ? "items-start" : "items-end"}`}
                >
                  {/* Sender Metadata */}
                  <div className="flex items-center space-x-2 px-1 text-xs text-gray-500">
                    <span className="font-semibold text-gray-400">
                      {isAmica ? "AMICA" : "Anuki"}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[10px]">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msgMode !== "default" && (
                      <>
                        <span>•</span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                          msgMode === "vent" ? "bg-pink-950/40 text-pink-400" :
                          msgMode === "brainstorm" ? "bg-cyan-950/40 text-cyan-400" :
                          msgMode === "roast" ? "bg-rose-950/40 text-rose-400" :
                          msgMode === "focus" ? "bg-emerald-950/40 text-emerald-400" : "bg-violet-950/40 text-violet-400"
                        }`}>
                          {msgMode}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={`max-w-2xl px-4 py-3 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-md ${bubbleTheme}`}>
                    {/* Render Content */}
                    <div className="prose prose-invert prose-sm max-w-none text-gray-100">
                      {msg.content}
                    </div>

                    {/* Display Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-800/80 grid grid-cols-2 gap-2">
                        {msg.attachments.map((att, attIdx) => {
                          const isImage = att.mimeType.startsWith("image/");
                          return (
                            <div 
                              key={attIdx} 
                              className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-2 flex items-center space-x-2"
                            >
                              {isImage ? (
                                <img 
                                  src={att.base64} 
                                  alt={att.name} 
                                  className="w-8 h-8 rounded-lg object-cover bg-gray-900 shrink-0"
                                />
                              ) : (
                                <FileText className="w-8 h-8 text-amber-500 bg-gray-900 p-1.5 rounded-lg shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-medium text-gray-300 truncate" title={att.name}>
                                  {att.name}
                                </p>
                                <p className="text-[9px] font-mono text-gray-500">
                                  {(att.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Simulated/Loader state */}
            {isSending && (
              <div className="flex flex-col space-y-1.5 items-start">
                <div className="flex items-center space-x-2 px-1 text-xs text-gray-500">
                  <span className="font-semibold text-gray-400">AMICA</span>
                  <span>•</span>
                  <span className="text-[10px] animate-pulse text-cyan-400">Thinking...</span>
                </div>
                <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl px-4 py-3 flex items-center space-x-2.5">
                  <div className="flex space-x-1">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-gray-400 font-medium">Formulating responsive neural path...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Interface Area */}
        <div className="p-4 md:p-6 bg-gray-950/40 border-t border-gray-800/80 shrink-0 relative">
          <div className="max-w-3xl mx-auto relative">
            
            {/* Quick Context Prompt Suggestions */}
            {MODE_PROMPTS[currentMode]?.length > 0 && messages.length < 5 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {MODE_PROMPTS[currentMode].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputMessage(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="text-xs bg-gray-900/80 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-gray-300 py-1 px-2.5 rounded-lg transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Slash commands Dropdown panel */}
            {showCommandsDropdown && (
              <div className="absolute bottom-full left-0 w-64 bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl p-2 mb-2 z-40 overflow-hidden">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-900">
                  Select Cognitive Mode
                </div>
                <div className="space-y-0.5 mt-1 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => handleModeChange("default")}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-gray-900 flex items-center justify-between text-gray-200 transition-colors"
                  >
                    <span className="font-semibold text-amber-400">/default</span>
                    <span className="text-[10px] text-gray-500">Conversational</span>
                  </button>
                  <button
                    onClick={() => handleModeChange("vent")}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-gray-900 flex items-center justify-between text-gray-200 transition-colors"
                  >
                    <span className="font-semibold text-pink-400">/vent</span>
                    <span className="text-[10px] text-gray-500">Active Listener</span>
                  </button>
                  <button
                    onClick={() => handleModeChange("brainstorm")}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-gray-900 flex items-center justify-between text-gray-200 transition-colors"
                  >
                    <span className="font-semibold text-cyan-400">/brainstorm</span>
                    <span className="text-[10px] text-gray-500">Creative partner</span>
                  </button>
                  <button
                    onClick={() => handleModeChange("roast")}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-gray-900 flex items-center justify-between text-gray-200 transition-colors"
                  >
                    <span className="font-semibold text-rose-400">/roast</span>
                    <span className="text-[10px] text-gray-500">Playful banter</span>
                  </button>
                  <button
                    onClick={() => handleModeChange("focus")}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-gray-900 flex items-center justify-between text-gray-200 transition-colors"
                  >
                    <span className="font-semibold text-emerald-400">/focus</span>
                    <span className="text-[10px] text-gray-500">Direct coach</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowCommandsDropdown(false);
                      triggerDiagnostics();
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-gray-900 flex items-center justify-between text-gray-200 transition-colors border-t border-gray-900"
                  >
                    <span className="font-semibold text-violet-400">/diagnostics</span>
                    <span className="text-[10px] text-gray-500">Health Check</span>
                  </button>
                </div>
              </div>
            )}

            {/* Input Form Wrapper */}
            <div className="bg-gray-900/90 border border-gray-800/80 rounded-2xl overflow-hidden focus-within:border-amber-500/40 focus-within:ring-1 focus-within:ring-amber-500/20 shadow-xl">
              
              {/* Attachment Preview Strip */}
              {attachments.length > 0 && (
                <div className="bg-gray-950/65 px-4 py-2.5 border-b border-gray-800/60 flex flex-wrap gap-2">
                  {attachments.map((att, idx) => {
                    const isImg = att.mimeType.startsWith("image/");
                    return (
                      <div 
                        key={idx} 
                        className="bg-gray-900 border border-gray-800 rounded-xl pl-2 pr-1.5 py-1 flex items-center space-x-2 text-xs max-w-[200px]"
                      >
                        {isImg ? (
                          <img 
                            src={att.base64} 
                            alt={att.name} 
                            className="w-5 h-5 rounded object-cover"
                          />
                        ) : (
                          <FileText className="w-4 h-4 text-amber-500" />
                        )}
                        <span className="truncate flex-1 text-[11px] text-gray-300" title={att.name}>
                          {att.name}
                        </span>
                        <button 
                          onClick={() => removeAttachment(idx)}
                          className="p-0.5 rounded hover:bg-gray-800 text-gray-500 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Text Input Row */}
              <div className="flex items-end px-4 py-3 space-x-2">
                {/* File picker button */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl text-gray-400 hover:text-amber-400 hover:bg-gray-800/60 transition-colors shrink-0 cursor-pointer"
                  title="Attach file/screenshot for context"
                  style={{ minWidth: "40px", minHeight: "40px" }}
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  multiple
                  className="hidden" 
                  accept="image/*,application/pdf,text/*"
                />

                {/* Voice transcription / Hands-free speech mode button */}
                <button
                  onClick={() => setVoiceActive(!voiceActive)}
                  disabled={!speechSupported}
                  className={`p-2 rounded-xl transition-all shrink-0 cursor-pointer flex items-center justify-center relative ${
                    !speechSupported 
                      ? "text-gray-600 cursor-not-allowed opacity-50" 
                      : voiceActive 
                        ? voiceStatus === "listening"
                          ? "bg-cyan-550/20 text-cyan-400 border border-cyan-500/40 animate-pulse shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                          : "bg-amber-500/10 text-amber-500 border border-amber-500/30 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                        : "text-gray-400 hover:text-amber-400 hover:bg-gray-800/60"
                  }`}
                  title={
                    !speechSupported 
                      ? "Speech Recognition not supported in this browser" 
                      : voiceActive 
                        ? `Voice Active. Say "AMICA..." (Current Status: ${voiceStatus})` 
                        : "Activate hands-free voice mode (Wake Word: AMICA)"
                  }
                  style={{ minWidth: "40px", minHeight: "40px" }}
                >
                  {voiceActive ? (
                    voiceStatus === "listening" ? (
                      <>
                        <Mic className="w-5 h-5 text-cyan-400" />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5 text-amber-500" />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                      </>
                    )
                  ) : (
                    <Mic className="w-5 h-5 opacity-40" />
                  )}
                </button>

                {/* Main Textarea */}
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Type a message or '/' for cognitive modes..."
                  rows={1}
                  className="flex-1 max-h-36 min-h-[40px] py-2 bg-transparent text-gray-100 placeholder-gray-500 border-0 outline-none focus:ring-0 resize-none text-sm font-sans"
                  style={{ overflowY: "auto" }}
                />

                {/* Send Button */}
                <button 
                  onClick={() => handleSend()}
                  disabled={isSending || (!inputMessage.trim() && attachments.length === 0)}
                  className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold disabled:bg-gray-800 disabled:text-gray-600 transition-all shrink-0 shadow-lg shadow-amber-500/5 cursor-pointer flex items-center justify-center"
                  style={{ minWidth: "40px", minHeight: "40px" }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Small Action Status Row */}
              <div className="bg-gray-950/30 px-4 py-1.5 border-t border-gray-900 flex justify-between items-center text-[10px] text-gray-500 font-medium">
                <span className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Interactive Command Mode active</span>
                </span>
                <span className="hidden sm:inline font-mono">Press Enter to send, Shift+Enter for newline</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Friend Lore Config Drawer/Modal */}
      {showLoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-950/40">
              <div className="flex items-center space-x-2.5">
                <Brain className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-display font-bold text-base text-gray-200">Personalize Friend Lore</h3>
                  <p className="text-xs text-gray-500">Configure AMICA's native memory database</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLoreModal(false)}
                className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const updatedLore: FriendLore = {
                hobbies: fd.get("hobbies") as string,
                insideJokes: fd.get("insideJokes") as string,
                goals: fd.get("goals") as string,
                customLore: fd.get("customLore") as string,
              };
              saveLore(updatedLore);
            }} className="p-5 space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 block uppercase tracking-wider">Favorite Hobbies</label>
                <input 
                  type="text" 
                  name="hobbies" 
                  defaultValue={friendLore.hobbies}
                  placeholder="What does Anuki like to do?"
                  className="w-full bg-gray-950 border border-gray-800 focus:border-amber-500/40 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 block uppercase tracking-wider">Shared Inside Jokes</label>
                <input 
                  type="text" 
                  name="insideJokes" 
                  defaultValue={friendLore.insideJokes}
                  placeholder="Inside jokes to use in conversation or roasts"
                  className="w-full bg-gray-950 border border-gray-800 focus:border-amber-500/40 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 block uppercase tracking-wider">Current Major Goals</label>
                <input 
                  type="text" 
                  name="goals" 
                  defaultValue={friendLore.goals}
                  placeholder="What is Anuki striving for right now?"
                  className="w-full bg-gray-950 border border-gray-800 focus:border-amber-500/40 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 block uppercase tracking-wider">Custom Memories & Additional Lore</label>
                <textarea 
                  name="customLore" 
                  defaultValue={friendLore.customLore}
                  rows={3}
                  placeholder="Enter any custom memories, relationship dynamics, background facts, or details you want AMICA to know natively..."
                  className="w-full bg-gray-950 border border-gray-800 focus:border-amber-500/40 rounded-xl px-3 py-2 text-sm text-gray-200 outline-none transition-colors resize-none font-sans"
                />
              </div>

              {/* Action row */}
              <div className="pt-4 border-t border-gray-800 flex justify-end space-x-2.5">
                <button 
                  type="button"
                  onClick={() => {
                    if (window.confirm("Restore factory default lore configuration?")) {
                      saveLore(DEFAULT_LORE);
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-rose-400 hover:bg-rose-950/20 transition-all"
                >
                  Restore Defaults
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs transition-all flex items-center space-x-1.5 shadow-lg shadow-amber-500/10 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Update Cognitive Base</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── API Key Modal ──────────────────────────────────── */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-gray-900 border border-amber-500/20 rounded-2xl shadow-2xl shadow-amber-500/5 p-6 space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-gray-100">Gemini API Key Required</h2>
                <p className="text-xs text-gray-400">Stored locally in your browser only</p>
              </div>
              <button onClick={() => setShowApiKeyModal(false)} className="ml-auto p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed">
              AMICA runs entirely in your browser. Enter your{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                Google Gemini API key
              </a>{' '}
              to power the cognitive engine. It is never sent to any server.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 block uppercase tracking-wider">API Key</label>
              <input
                type="text"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const key = apiKeyInput.trim();
                    if (key) {
                      localStorage.setItem('amica_gemini_key', key);
                      setApiKey(key);
                      setApiKeyInput('');
                      setShowApiKeyModal(false);
                      setApiError(null);
                    }
                  }
                }}
                placeholder="AIzaSy..."
                autoFocus
                spellCheck={false}
                className="w-full bg-gray-950 border border-gray-800 focus:border-amber-500/40 rounded-xl px-3 py-2.5 text-sm text-gray-200 outline-none transition-colors font-mono"
              />
            </div>

            <div className="flex space-x-2.5 pt-1">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="flex-1 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const key = apiKeyInput.trim();
                  if (key) {
                    localStorage.setItem('amica_gemini_key', key);
                    setApiKey(key);
                    setApiKeyInput('');
                    setShowApiKeyModal(false);
                    setApiError(null);
                  }
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition-colors"
              >
                Save &amp; Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Google Sheets Backend Modal ──────────────────────────────────── */}
      {showSheetsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-gray-900 border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-500/10 p-6 space-y-5 my-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-gray-100">Google Sheets Online Backend</h2>
                <p className="text-xs text-gray-400">Sync messages, reminders, lore &amp; tasks directly to Google Sheets</p>
              </div>
              <button onClick={() => setShowSheetsModal(false)} className="ml-auto p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Instructions */}
            <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3 text-xs text-gray-300">
              <h3 className="font-bold text-amber-400 flex items-center space-x-1.5">
                <span>Setup Instructions (1-Minute ⚡)</span>
              </h3>
              <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-gray-400">
                <li>Create a blank Google Sheet at <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline inline-flex items-center space-x-0.5"><span>sheets.new</span> <ExternalLink className="w-3 h-3 ml-0.5" /></a></li>
                <li>Go to <strong>Extensions &gt; Apps Script</strong></li>
                <li>Delete default code, paste the script below, and click <strong>Deploy &gt; New deployment</strong></li>
                <li>Type: <strong>Web app</strong> | Execute as: <strong>Me</strong> | Access: <strong>Anyone</strong></li>
                <li>Click <strong>Deploy</strong>, authorize permissions, and copy the Web App URL!</li>
              </ol>

              <div className="pt-2 flex items-center justify-between border-t border-gray-900">
                <span className="text-[11px] font-mono text-gray-500">Apps Script Code Template</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 3000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 font-bold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? "Script Copied!" : "Copy Apps Script Code"}</span>
                </button>
              </div>
            </div>

            {/* Web App URL Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 block uppercase tracking-wider">
                Google Sheets Web App URL
              </label>
              <input
                type="text"
                value={tempSheetsUrl}
                onChange={e => setTempSheetsUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                spellCheck={false}
                className="w-full bg-gray-950 border border-gray-800 focus:border-emerald-500/40 rounded-xl px-3 py-2.5 text-sm text-gray-200 outline-none transition-colors font-mono"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2.5 pt-2">
              {sheetsUrl && (
                <button
                  onClick={() => {
                    if (window.confirm("Disconnect Google Sheets backend? Data remains safe locally.")) {
                      localStorage.removeItem("amica_sheets_url");
                      setSheetsUrl("");
                      setTempSheetsUrl("");
                      setShowSheetsModal(false);
                      setSheetsSyncStatus("idle");
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-950/40 border border-rose-900/60 hover:bg-rose-900/40 text-rose-400 text-xs font-bold transition-colors"
                >
                  Disconnect
                </button>
              )}
              <button
                onClick={() => setShowSheetsModal(false)}
                className="flex-1 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const url = tempSheetsUrl.trim();
                  if (url) {
                    localStorage.setItem("amica_sheets_url", url);
                    setSheetsUrl(url);
                    setShowSheetsModal(false);
                    setSheetsSyncStatus("syncing");
                    const success = await syncToSheets(url, { messages, lore: friendLore, tasks: studentTasks, reminders });
                    setSheetsSyncStatus(success ? "synced" : "error");
                  }
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Database className="w-4 h-4" />
                <span>Save &amp; Connect Backend</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

