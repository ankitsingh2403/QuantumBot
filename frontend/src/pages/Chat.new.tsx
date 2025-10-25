import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import styles from "./Chat.module.css";
import ChatItem from "../components/chat/ChatItem";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatLoading from "../components/chat/ChatLoading";
import SpinnerOverlay from "../components/shared/SpinnerOverlay";

import {
  createChatSession,
  getChatSessions,
  getChatSessionById,
  sendMessageToChatSession,
} from "../../helpers/chat-session-api";

import { useAuth } from "../context/context";

import sendIcon from "/logos/send-icon.png";
import noMsgBot from "/logos/no-msg2.png";
import upArrow from "/logos/up-arrow.png";

const logo = {
  animate: { rotate: 0 },
  animateReverse: { rotate: 180 },
  initialBtn: { opacity: 0, y: -20 },
  animateBtn: { opacity: 1, y: 0 },
  exitBtn: { opacity: 0, y: 20 },
};

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

type ChatSession = {
  _id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
};

const Chat = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [deleteChatToggle, setDeleteChatToggle] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const getInitialChats = async () => {
      try {
        if (auth?.isLoggedIn && auth.user) {
          const data = await getChatSessions();
          if (data?.sessions?.length > 0) {
            const lastSession = data.sessions[0];
            setCurrentSessionId(lastSession._id);
            const sessionData = await getChatSessionById(lastSession._id);
            if (sessionData?.session?.messages) {
              setChatMessages(sessionData.session.messages);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load chat sessions:", error);
        toast.error("Failed to load chat history");
      } finally {
        setIsLoadingChats(false);
      }
    };

    getInitialChats();
  }, [auth?.isLoggedIn, auth?.user]);

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
    try {
      setIsLoadingChats(true);
      const data = await getChatSessionById(sessionId);
      if (data?.session) {
        setCurrentSessionId(sessionId);
        setChatMessages(data.session.messages);
        setIsMobileMenuOpen(false);
      }
    } catch (error) {
      toast.error("Failed to load chat session");
    } finally {
      setIsLoadingChats(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputRef.current?.value;

    if (!content) return;
    if (!auth?.isLoggedIn) {
      return navigate("/login");
    }

    try {
      setIsLoading(true);

      if (!currentSessionId) {
        const session = await createChatSession();
        if (session?.session?._id) {
          setCurrentSessionId(session.session._id);
        } else {
          throw new Error("Failed to create chat session");
        }
      }

      const data = await sendMessageToChatSession(currentSessionId!, content);
      if (data?.session?.messages) {
        setChatMessages(data.session.messages);
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChatsToggle = () => {
    setDeleteChatToggle(!deleteChatToggle);
  };

  const clearChatsHandler = async () => {
    try {
      setIsLoading(true);
      await handleNewChat();
      setDeleteChatToggle(false);
    } catch (error) {
      toast.error("Failed to clear chats");
    } finally {
      setIsLoading(false);
    }
  };

  const chats = chatMessages.map((chat, index) => (
    <ChatItem key={index} content={chat.content} role={chat.role} />
  ));

  const placeHolder = (
    <div className={styles.placeholder}>
      <img src={noMsgBot} alt="bot" />
      <p>How can I assist you today?</p>
    </div>
  );

  return (
    <div className={`${styles.parent} ${isMobileMenuOpen ? styles.sidebarOpen : ""}`}>
      <div className={styles.sidebarContainer}>
        <ChatSidebar
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          currentSessionId={currentSessionId}
        />
      </div>
      <div className={styles.mainContent}>
        <div className={styles.chatHeader}>
          <button
            className={styles.menuButton}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <button className={styles.newChatButton} onClick={handleNewChat}>
            + New Chat
          </button>
        </div>
        <div className={styles.messageArea}>
          <div className={styles.chat} ref={messageContainerRef}>
            {isLoadingChats && <SpinnerOverlay />}
            {!isLoadingChats && (
              <>
                {chatMessages.length === 0 && placeHolder}
                {chatMessages.length !== 0 && chats}
                {isLoading && <ChatLoading />}
              </>
            )}
          </div>
          <div className={styles.inputContainer}>
            <div className={styles.eraseMsgs}>
              <motion.img
                variants={logo}
                animate={!deleteChatToggle ? "animate" : "animateReverse"}
                src={upArrow}
                alt="top icon"
                onClick={deleteChatsToggle}
              />
              <AnimatePresence>
                {deleteChatToggle && (
                  <motion.button
                    className={styles.eraseBtn}
                    onClick={clearChatsHandler}
                    variants={logo}
                    initial="initialBtn"
                    animate="animateBtn"
                    exit="exitBtn"
                  >
                    CLEAR CHATS
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <form onSubmit={handleSubmit} className={styles.chatBox}>
              <textarea
                ref={inputRef}
                className={styles.chatInput}
                placeholder="Send a message..."
                rows={1}
                disabled={isLoading}
              />
              <button type="submit" className={styles.sendButton} disabled={isLoading}>
                <img src={sendIcon} alt="send" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;