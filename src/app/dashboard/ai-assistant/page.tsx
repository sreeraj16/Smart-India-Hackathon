'use client';

import React, { useState, useEffect, useRef } from 'react';
import { HackathonStateManager } from '@/lib/store/stateManager';
import { Team, ProblemStatement } from '@/lib/types';
import { Bot, Send, User, Sparkles, Lightbulb, ShieldQuestion, FileText, Cpu } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export default function AIAssistantPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = HackathonStateManager.getCurrentUser();
    const loadedTeam = HackathonStateManager.getTeamById(user?.team_id || 'SIH-2026-1001');
    setTeam(loadedTeam || null);

    const activePS = loadedTeam?.selected_problem_statements[0];
    const initialGreeting: ChatMessage = {
      id: 'msg-1',
      sender: 'ai',
      text: `Hello ${user?.name || 'Team Lead'}! I am your AI Hackathon Assistant for team "${loadedTeam?.team_name || 'NeuralCrafters'}". I am pre-configured with context on your selected problem statement: "${activePS ? activePS.problem_title : 'Urban Traffic AI'}". How can I assist your pitch preparation today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([initialGreeting]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const suggestedQuestions = [
    "Explain our problem statement.",
    "Give us innovative solution ideas.",
    "What technologies should we use?",
    "How can we make our solution unique?",
    "What should our PPT contain?",
    "Give us possible jury questions.",
    "How can we improve our pitch?"
  ];

  const generateAIResponse = (query: string, teamData: Team | null): string => {
    const ps = teamData?.selected_problem_statements[0] || {
      problem_id: 'SIH1501',
      problem_title: 'AI-Driven Smart Traffic Management System for Urban Nodes',
      domain: 'Smart Vehicles / Transportation'
    };

    const q = query.toLowerCase();

    if (q.includes('explain')) {
      return `📌 **Problem Statement Analysis for ${ps.problem_id}**\n\nTitle: "${ps.problem_title}"\nDomain: ${ps.domain}\n\n**Core Objective:** Urban intersections suffer from static timer delays leading to gridlock. Your project must capture live video streams or sensor data at road junctions, calculate vehicle queue density in real time, and dynamically adjust green signal phases.\n\n**Key Metrics to Emphasize to Jury:** Reduction in average delay time per vehicle, lower carbon emissions during idling, and emergency vehicle priority override capabilities.`;
    }

    if (q.includes('innovative') || q.includes('solution') || q.includes('unique')) {
      return `💡 **Innovative Angles for ${teamData?.team_name || 'Your Team'}**\n\n1. **Edge-AI Processing:** Process video feeds locally on Jetson Nano / Raspberry Pi 5 to maintain zero latency and avoid sending high-bandwidth raw video to the cloud.\n2. **Emergency Vehicle Priority (Green Wave):** Integrate RFID / siren audio detection so ambulances automatically trigger a green corridor across 3 consecutive junctions.\n3. **Reinforcement Learning Controller:** Use Q-Learning to adapt signal durations based on historical traffic flow patterns during peak office hours vs weekends.`;
    }

    if (q.includes('technologies') || q.includes('tech')) {
      return `🛠️ **Recommended Tech Stack:**\n\n• **Computer Vision & ML:** OpenCV, YOLOv8 / YOLOv11 for real-time vehicle detection and counting.\n• **Edge Hardware:** Nvidia Jetson Nano or Raspberry Pi with Coral TPU accelerator.\n• **Backend & Telemetry:** Node.js / FastAPI with WebSockets for real-time junction telemetry dashboard.\n• **Database & Sync:** Supabase PostgreSQL with PostGIS for geospatial junction coordinates.`;
    }

    if (q.includes('ppt') || q.includes('slides')) {
      return `📊 **Recommended 8-Slide Hackathon Pitch Deck Structure:**\n\nSlide 1: Team Name, Team ID (${teamData?.team_id || 'SIH-2026-1001'}), Problem Statement ID (${ps.problem_id}).\nSlide 2: Problem Definition & Root Cause (Urban Traffic Gridlock).\nSlide 3: Proposed Solution Architecture & Flowchart.\nSlide 4: Novelty & Technical Innovation (Edge AI & Green Wave).\nSlide 5: Live Prototype / Demonstration Results.\nSlide 6: Scalability & Implementation Feasibility at RGUKT / Smart Cities.\nSlide 7: Business Impact & Environmental Benefits.\nSlide 8: Conclusion & Future Scope.`;
    }

    if (q.includes('jury') || q.includes('questions') || q.includes('q&a')) {
      return `🎯 **Top 5 Anticipated Jury Questions & Ideal Responses:**\n\n1. *Jury:* "What happens if a camera lens gets blocked or fails during rain?"\n   *Answer:* "Our system includes fail-safe default fixed timers and sends immediate health ping telemetry to central monitoring control."\n\n2. *Jury:* "How does your solution scale to a city with 500 intersections?"\n   *Answer:* "Because vision processing is decentralized at edge nodes, central bandwidth requirements remain linear and minimal."\n\n3. *Jury:* "Have you validated the detection accuracy at night?"\n   *Answer:* "We fine-tuned our object detection model using thermal and low-light headlight datasets."`;
    }

    if (q.includes('pitch') || q.includes('improve')) {
      return `🚀 **Pitching Best Practices (4 Minutes Limit):**\n\n• **0:00 - 0:45:** Hook the jury with a real-life metric (e.g., "Commuters lose 120 hours annually stuck at static red lights").\n• **0:45 - 2:00:** Present your working demo or architecture clearly.\n• **2:00 - 3:15:** Highlight your core technical novelty (Edge AI + RFID Emergency Override).\n• **3:15 - 4:00:** Summarize feasibility and impact. Practice transitions between members!`;
    }

    return `🤖 **Guidance for ${ps.problem_id}:**\n\nFor "${ps.problem_title}", focus on demonstrating a functional prototype, quantifying feasibility, and proving how your team's approach directly addresses the published rubric criteria (20 marks each for Innovation, Relevance, Technical Feasibility, Presentation, and Q&A).`;
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsTyping(true);

    setTimeout(() => {
      const responseText = generateAIResponse(query, team);
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-800 via-brand-600 to-rose-600 text-white flex items-center justify-center shadow-md border border-amber-500/30">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              AI Hackathon Assistant <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
            </h1>
            <p className="text-xs text-slate-500">
              Context-aware insights, technical feasibility, and pitch deck preparation for team <strong className="text-slate-800">{team?.team_name || 'NeuralCrafters'}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Questions Chips */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Suggested Questions
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="text-xs bg-white hover:bg-brand-50 hover:text-brand-700 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl transition-all shadow-sm font-medium"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[520px]">
        
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-sm">
                  AI
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-none'
                    : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/80 whitespace-pre-line'
                }`}
              >
                {msg.text}
                <div className={`text-[10px] mt-2 ${msg.sender === 'user' ? 'text-brand-200 text-right' : 'text-slate-400'}`}>
                  {msg.timestamp}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-slate-400 italic">
              <Bot className="w-4 h-4 animate-bounce text-brand-600" /> AI Assistant is generating response...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about your problem statement, PPT structure, or jury Q&A..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim()}
              className="px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer"
            >
              Send <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
