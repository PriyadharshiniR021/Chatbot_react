import React, { useEffect, useRef, useState } from 'react'
import { ChatbotIcon } from './components/ChatbotIcon'
import ChatForm from './components/ChatForm'
import ChatMessage from './components/ChatMessage';
import { companyInfo } from './companyInfo';

export const App = () => {
  const [chatHistory, setChatHistory] = useState([{
    hideInChat: true,
    role: "model",
    text: companyInfo
  }]);
  const [showChatbot, setShowChatbot] = useState(false);

  const chatBodyRef = useRef();

  // const generateBotResponse = async (history) => {
  //   //helper function to update chat history
  //   const updateHistory = (text, isError = false) => {
  //     setChatHistory(prev => [...prev.filter(msg => msg.text !== "Thinking..."), {role: "model", text, isError}]);
  //   }

  //   //format chat history for API request
  //   const formattedHistory = history.map(({role, text}) => ({role, parts: [{text}]}));

  //   const requestOptions = {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json",
  //        "x-goog-api-key": import.meta.env.VITE_API_KEY
  //      },
  //     body: JSON.stringify({contents: formattedHistory})
  //   }

  //   try{
  //     //make api call to get bot's response
  //     const response = await fetch(import.meta.env.VITE_API_URL, requestOptions);
  //     const data = await response.json();

  //     if(!response.ok) throw new Error(data.error?.message || "Something went wrong!");


  //     // clean and update chat history with bot's response
  //     const apiResponseText = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, "$1").trim();
  //     updateHistory(apiResponseText);

  //   }catch (error){
  //     updateHistory(error.message, true);
  //   }
  // };

  const generateBotResponse = async (history) => {
    // helper function to update chat history
    const updateHistory = (text, audioUrl = null, isError = false) => {
      setChatHistory(prev => [
        ...prev.filter(msg => msg.text !== "Thinking..."),
        { role: "model", text, audioUrl, isError }
      ]);
    };

    // format chat history for API request
    const formattedHistory = history.map(({ role, text }) => ({
      role,
      parts: [{ text }]
    }));

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": import.meta.env.VITE_API_KEY
      },
      body: JSON.stringify({ contents: formattedHistory })
    };

    try {
      // 1. Call your main chatbot API
      const response = await fetch(import.meta.env.VITE_API_URL, requestOptions);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error?.message || "Something went wrong!");

      // Clean raw chatbot text
      const apiResponseText = data.candidates[0].content.parts[0].text
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .trim();

      // 2. Translate English → Malayalam using MyMemory API
      const translateResponse = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(apiResponseText)}&langpair=en|ml`
      );

      const translateData = await translateResponse.json();
      const translatedText = translateData.responseData.translatedText;

      // 3. ElevenLabs TTS → Malayalam audio
      // const ttsResponse = await fetch(
      //   "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
      //   {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //       "xi-api-key": import.meta.env.VITE_ELEVENLABS_API_KEY
      //     },
      //     body: JSON.stringify({
      //       text: translatedText,
      //       model_id: "eleven_multilingual_v2",
      //       voice_settings: {
      //         stability: 0.5,
      //         similarity_boost: 0.5
      //       }
      //     })
      //   }
      // );

      // if (!ttsResponse.ok) throw new Error("TTS failed!");

      // const audioBlob = await ttsResponse.blob();
      // const audioUrl = URL.createObjectURL(audioBlob);

      // // 4. Update chat with Malayalam text + audio
      // updateHistory(translatedText, audioUrl);

      // 3. ElevenLabs TTS → Malayalam audio
      const ttsResponse = await fetch(
        "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": import.meta.env.VITE_ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: translatedText,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5
            }
          })
        }
      );

      if (!ttsResponse.ok) throw new Error("TTS failed!");

      // Convert response to blob
      const audioBlob = await ttsResponse.blob();

      // Create URL for <audio> tag or auto-play
      const audioUrl = URL.createObjectURL(audioBlob);

      // Optional: auto-play
      const audio = new Audio(audioUrl);
      audio.play();

      // 4. update chat with Malayalam text + audioUrl
      updateHistory(translatedText, audioUrl);


    } catch (error) {
      updateHistory(error.message, null, true);
    }
  };


  useEffect(() => {
    //auto-scroll whenever chat history updates
    chatBodyRef.current.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: "smooth" });
  }, [chatHistory]);

  return (
    <div className={`container ${showChatbot ? "show-chatbot" : ""}`}>
      <button onClick={() => setShowChatbot(prev => !prev)} className="chatbot-toggler">
        <span className="material-symbols-rounded">mode_comment</span>
        <span className="material-symbols-rounded">close</span>
      </button>

      <div className="chatbot-popup">
        {/*Chatbot header */}
        <div className="chat-header">
          <div className="header-info">
            <ChatbotIcon />
            <h2 className="logo-text">Chatbot</h2>
          </div>
          <button onClick={() => setShowChatbot(prev => !prev)} className="material-symbols-rounded">
            keyboard_arrow_down
          </button>
        </div>

        {/*Chatbot body */}
        <div ref={chatBodyRef} className='chat-body'>
          <div className='message bot-message'>
            <ChatbotIcon />
            <p className='message-text'>
              Hey there 👋<br /> How can I help you today?
            </p>
          </div>

          {/*render chat history */}
          {chatHistory.map((chat, index) => (
            <ChatMessage key={index} chat={chat} />
          ))}
        </div>

        {/*Chatbot footer */}
        <div className="chat-footer">
          <ChatForm chatHistory={chatHistory} setChatHistory={setChatHistory} generateBotResponse={generateBotResponse} />
        </div>
      </div>
    </div>
  )
}
