import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import styles from "./Chat.module.css";
import ChatItem from "../components/chat/ChatItem";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatLoading from "../components/chat/ChatLoading";
import SpinnerOverlay from "../components/shared/SpinnerOverlay";
import toast from "react-hot-toast";

import { useAuth } from "../context/context";
import {
  createChatSession,
  getChatSessionById,
  sendMessageToChatSession,
} from "../../helpers/chat-session-api";

import sendIcon from "/logos/send-icon.png";
import noMsgBot from "/logos/no-msg2.png";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

const Chat = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const fetchSessionMessages = async (sessionId: string) => {
    try {
      setIsLoadingChats(true);
      const data = await getChatSessionById(sessionId);
      if (data?.session?.messages) {
        setChatMessages(data.session.messages);
        setCurrentSessionId(sessionId);
      } else {
        setChatMessages([]);
      }
    } catch (error) {
      toast.error("Failed to load chat session");
    } finally {
      setIsLoadingChats(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const session = await createChatSession();
      if (session?.session?._id) {
        setCurrentSessionId(session.session._id);
        setChatMessages([]);
        setIsMobileMenuOpen(false);
      }
    } catch (error) {
      toast.error("Failed to create new chat");
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    await fetchSessionMessages(sessionId);
    setIsMobileMenuOpen(false);
  };

  const sendMsgHandler = async () => {
    if (!auth?.isLoggedIn) return navigate("/login");
    if (!inputRef.current) return;

    const content = inputRef.current.value.trim();
    if (!content) return;

    inputRef.current.value = "";
    const newMessage: Message = { role: "user", content };
    setChatMessages((prev) => [...prev, newMessage]);

    try {
      setIsLoading(true);
      // Ensure session exists
      let sessionId = currentSessionId;
      if (!sessionId) {
        const session = await createChatSession();
        if (session?.session?._id) {
          sessionId = session.session._id;
          setCurrentSessionId(sessionId);
        } else {
          throw new Error("Failed to create chat session");
        }
      }

      // Send message
      if (sessionId) {
        const chatData = await sendMessageToChatSession(sessionId, content);
        if (chatData?.session?.messages) setChatMessages(chatData.session.messages);
      }
    } catch (err: any) {
      console.error("sendMsgHandler error:", err);
      toast.error(err?.message || "Something went wrong while sending message");
    } finally {
      setIsLoading(false);
    }
  };

  const placeHolder = (
    <div className={styles.no_msgs}>
      <h3>GPT 3.5 TURBO</h3>
      <motion.div
        className={styles.no_msg_logo}
        animate={{ y: [0, -5, 0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 4 }}
      >
        <img alt="no msg bot" src={noMsgBot} />
      </motion.div>
      <p>It's quiet in here! Send a message to start the conversation.</p>
    </div>
  );

  return (
    <div className={`${styles.parent} ${isMobileMenuOpen ? styles.sidebarOpen : ""}`}>
      {/* Sidebar */}
      <div className={styles.sidebarContainer}>
        <ChatSidebar
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          currentSessionId={currentSessionId ?? undefined}
        />
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.chatHeader}>
          <button
            className={styles.menuButton}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            ☰
          </button>
          <button className={styles.newChatButton} onClick={handleNewChat}>
            + New Chat
          </button>
        </div>

        <div className={styles.messageArea}>
          <div className={styles.chat} ref={messageContainerRef}>
            {isLoadingChats ? (
              <SpinnerOverlay />
            ) : chatMessages.length === 0 ? (
              placeHolder
            ) : (
              chatMessages.map((chat, i) => (
                <ChatItem
                  key={`${i}-${chat.content.slice(0, 20)}`}
                  role={chat.role}
                  content={chat.content}
                />
              ))
            )}
            {isLoading && <ChatLoading />}
          </div>

          <div className={styles.inputContainer}>
            <div className={styles.inputArea}>
              <textarea
                ref={inputRef}
                rows={1}
                className={styles.textArea}
                placeholder="Send a message..."
                disabled={isLoading}
              />
              <button className={styles.icon} onClick={sendMsgHandler}>
                <img src={sendIcon} alt="send" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
