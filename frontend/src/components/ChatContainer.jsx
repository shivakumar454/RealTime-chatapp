import React, { useEffect, useRef, useState } from "react";
import useChatStore from "../store/useChatStore.js";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    askConversation,
  } = useChatStore();

  const { authUser } = useAuthStore();

  const messageEndRef = useRef(null);

  const [showAi, setShowAi] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiSources, setAiSources] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiFoundContext, setAiFoundContext]=useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    getMessages(selectedUser._id);

    return () => unsubscribeFromMessages();
  }, [
    selectedUser._id,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader onAskAI={() => setShowAi(true)} />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  const handleAskAI = async () => {
  if (!aiQuestion.trim() || isAiLoading) return;

  try {
    setIsAiLoading(true);
    setAiError("");
    setAiAnswer("");
    setAiSources([]);
    setAiFoundContext(false);

    const data = await askConversation(aiQuestion);

    setAiAnswer(data.answer);
    setAiSources(data.sources || []);
    setAiFoundContext(data.foundContext);
    setAiQuestion("");
  } catch (error) {
    console.error("AI request failed:", error);

    setAiError(
      error.response?.data?.message ||
      "Unable to get an answer. Please try again."
    );
  } finally {
    setIsAiLoading(false);
  }
};

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      <ChatHeader onAskAI={() => setShowAi(true)} />

      {/* Ask AI Panel */}
      {showAi && (
        <div className="p-4 border-b border-base-300">

          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              Ask AI
            </h3>

            <button
              onClick={() => setShowAi(false)}
              className="text-lg"
            >
              ✕
            </button>
          </div>

          {/* Question input */}
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              placeholder="Ask something about this conversation..."
              className="input input-bordered input-sm flex-1"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAskAI();
                }
              }}
            />

             <button
  className="btn btn-sm"
  disabled={!aiQuestion.trim() || isAiLoading}
  onClick={handleAskAI}
>
  {isAiLoading ? "Thinking..." : "Ask"}
</button>
          </div>

          {aiError && (
  <div className="mt-3 alert alert-error text-sm">
    <span>{aiError}</span>
    <button
      className="btn btn-sm btn-ghost"
      onClick={() => setAiError("")}
    >
      Dismiss
    </button>
  </div>
)}

          {aiAnswer && (
  <div className="mt-4 p-3 rounded-lg bg-base-200">
    <p className="font-semibold mb-2">
  {aiFoundContext
    ? "🤖 AI Answer"
    : "🔎 Couldn't find an answer"}
</p>

    <p className="text-sm">
      {aiAnswer}
    </p>

    {aiSources.length > 0 && (
      <div className="mt-4">
        <p className="font-semibold mb-2">
          📚 Sources
        </p>

        <div className="space-y-2">
          {aiSources.map((source) => (
            <div
              key={source.messageId}
              className="p-2 rounded bg-base-300 text-sm"
            >
              <p>{source.text}</p>

              <p className="text-xs opacity-60 mt-1">
                Relevance: {source.score.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)}

        </div>
      )}

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${
              message.senderId === authUser._id
                ? "chat-end"
                : "chat-start"
            }`}
            ref={messageEndRef}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>

            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>

              <div className="char-bubble flex flex-col">
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-mb mb-2"
                  />
                )}

                {message.text && <p>{message.text}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <MessageInput />

    </div>
  );
};

export default ChatContainer;