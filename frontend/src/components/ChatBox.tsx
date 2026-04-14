'use client';
import { useEffect, useState, useRef } from 'react';
import { Send, User as UserIcon } from 'lucide-react';
import * as signalR from '@microsoft/signalr';
import api from '@/lib/api';

interface ChatMessage {
  id: number;
  roomType: string;
  roomId: number;
  senderId: number;
  senderName: string;
  message: string;
  createdAt: string;
}

interface ChatBoxProps {
  roomType: 'MATCH' | 'TEAM';
  roomId: number;
}

export default function ChatBox({ roomType, roomId }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [myUserName, setMyUserName] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMyUserName(localStorage.getItem('userName'));
    
    // Load lịch sử chat cũ
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/chat/${roomType}/${roomId}`);
        setMessages(res.data);
        scrollToBottom();
      } catch (err) {
        console.error('Không thể lấy lịch sử chat', err);
      }
    };
    fetchHistory();

    // Kết nối SignalR
    const token = localStorage.getItem('token');
    if (!token) return;

    // Use absolute URL pointing to backend
    const hubUrl = 'http://localhost:5029/chathub'; 

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);
  }, [roomType, roomId]);

  useEffect(() => {
    if (connection) {
      connection.on('ReceiveMessage', (msg: ChatMessage) => {
         setMessages(prev => [...prev, msg]);
         scrollToBottom();
      });

      connection.start()
        .then(() => {
          console.log('Connected to Chat Hub!');
          connection.invoke('JoinRoom', roomType, roomId);
        })
        .catch(e => console.log('Connection failed: ', e));
        
      return () => {
        connection.invoke('LeaveRoom', roomType, roomId).catch(err => console.error(err));
        connection.off('ReceiveMessage');
        connection.stop();
      };
    }
  }, [connection, roomType, roomId]);

  const scrollToBottom = () => {
    setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !connection) return;
    try {
      await connection.invoke('SendMessage', roomType, roomId, inputText);
      setInputText('');
    } catch (e) {
      console.error('Send message failed', e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
       e.preventDefault();
       handleSend();
    }
  };

  return (
    <div className="flex flex-col bg-white border border-gray-100 rounded-2xl shadow-sm h-[500px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between rounded-t-2xl">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
            💬 Phòng Chat {roomType === 'MATCH' ? 'Kèo Đấu' : 'Nội Bộ Đội Bóng'}
        </h3>
        <span className="flex h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse mr-2" title="Real-time Active"></span>
      </div>

      {/* Messages Window */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50 space-y-4">
        {messages.length === 0 ? (
           <div className="text-center text-gray-400 mt-20 italic text-sm">
              Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!
           </div>
        ) : (
          messages.map((m, idx) => {
            const isMe = m.senderName === myUserName;
            return (
              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? 'bg-green-600 text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'}`}>
                    {!isMe && <div className="text-xs font-bold text-gray-500 mb-1">{m.senderName}</div>}
                    <div className="text-sm">{m.message}</div>
                    <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-green-200' : 'text-gray-400'}`}>
                       {new Date(m.createdAt + (m.createdAt.endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                 </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white rounded-b-2xl border-t border-gray-100">
         <div className="flex items-center gap-2">
            <input 
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
            />
            <button 
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
               <Send className="w-5 h-5" />
            </button>
         </div>
      </div>
    </div>
  );
}
