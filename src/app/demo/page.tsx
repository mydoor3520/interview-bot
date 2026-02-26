'use client';

import { useState } from 'react';
import { DEMO_QUESTIONS, DEMO_INTRO, JOB_FUNCTION_LABELS, type DemoQuestion } from '@/lib/demo/demo-data';

type Phase = 'select' | 'interview' | 'result';
type JobFunction = keyof typeof DEMO_QUESTIONS;

interface Answer {
  question: string;
  answer: string;
  feedback: DemoQuestion['sampleFeedback'];
  aiPowered?: boolean;
}

export default function DemoPage() {
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedJobFunction, setSelectedJobFunction] = useState<JobFunction | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const currentQuestions = selectedJobFunction ? DEMO_QUESTIONS[selectedJobFunction] : [];
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const isFollowUp = answers.length > 0 && answers.length % 2 === 1;
  const questionText = isFollowUp ? currentQuestion?.followUp : currentQuestion?.question;
  const questionNumber = Math.floor(answers.length / 2) + 1;

  const handleStartInterview = () => {
    if (!selectedJobFunction) return;
    setPhase('interview');
    setCurrentQuestionIndex(0);
    setAnswers([]);

  };

  const handleSubmitAnswer = async () => {
    if (!currentInput.trim() || !currentQuestion || !selectedJobFunction) return;

    const answerText = currentInput;
    setCurrentInput('');
    setIsAnalyzing(true);


    let feedback: DemoQuestion['sampleFeedback'];
    let aiPowered = false;

    try {
      const response = await fetch('/api/demo/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobFunction: selectedJobFunction,
          questionIndex: currentQuestionIndex,
          isFollowUp,
          question: questionText,
          answer: answerText,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        feedback = data.feedback;
        aiPowered = data.aiPowered !== false;
      } else {
        feedback = currentQuestion.sampleFeedback;
      }
    } catch {
      feedback = currentQuestion.sampleFeedback;
    }

    const newAnswer: Answer = {
      question: questionText || '',
      answer: answerText,
      feedback,
      aiPowered,
    };

    setAnswers(prev => [...prev, newAnswer]);
    setIsAnalyzing(false);


    // Auto-advance after showing feedback
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (isFollowUp) {
      if (currentQuestionIndex < 2) {
        setCurrentQuestionIndex(prev => prev + 1);
    
      } else {
        completeDemo();
      }
    } else {
  
    }
  };

  const completeDemo = () => {
    if (selectedJobFunction) {
      localStorage.setItem('demo_completed', 'true');
      localStorage.setItem('demo_job_function', selectedJobFunction);
    }
    setPhase('result');
  };

  const resetDemo = () => {
    setPhase('select');
    setSelectedJobFunction(null);
    setCurrentQuestionIndex(0);
    setCurrentInput('');
    setAnswers([]);

    setIsAnalyzing(false);
  };

  const averageScore = answers.length > 0
    ? Math.round(answers.reduce((sum, a) => sum + a.feedback.score, 0) / answers.length)
    : 0;

  if (phase === 'select') {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">AI 면접 데모</h1>
            <p className="text-lg text-slate-600">가입 없이 3개 질문으로 AI 면접을 체험해보세요</p>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-700 mb-4">직무를 선택하세요</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(JOB_FUNCTION_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedJobFunction(key as JobFunction)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedJobFunction === key
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartInterview}
            disabled={!selectedJobFunction}
            className="w-full py-4 px-6 bg-blue-600 text-white rounded-lg font-medium text-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            면접 시작
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'interview') {
    return (
      <div className="min-h-screen bg-white py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Progress indicator */}
          <div className="mb-6 text-center">
            <span className="text-sm font-medium text-slate-600">질문 {questionNumber}/3</span>
          </div>

          {/* Chat messages */}
          <div className="space-y-4 mb-6">
            {/* Intro message */}
            {answers.length === 0 && selectedJobFunction && (
              <div className="flex justify-start">
                <div className="max-w-[80%] bg-slate-100 rounded-lg p-4">
                  <p className="text-slate-900">{DEMO_INTRO[selectedJobFunction]}</p>
                </div>
              </div>
            )}

            {/* Previous Q&A */}
            {answers.map((answer, idx) => (
              <div key={idx} className="space-y-4">
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-slate-100 rounded-lg p-4">
                    <p className="text-slate-900">{answer.question}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-blue-50 rounded-lg p-4">
                    <p className="text-slate-900">{answer.answer}</p>
                  </div>
                </div>
                {/* Feedback card */}
                <div className={`border rounded-lg p-4 space-y-3 ${
                  answer.feedback.score <= 3 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">AI 분석</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      answer.feedback.score >= 8 ? 'bg-green-100 text-green-700' :
                      answer.feedback.score >= 6 ? 'bg-blue-100 text-blue-700' :
                      answer.feedback.score >= 4 ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {answer.feedback.score}/10
                    </span>
                  </div>
                  {answer.feedback.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-700 mb-1">강점</p>
                      <ul className="space-y-1">
                        {answer.feedback.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                            <span className="text-green-600">✓</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-orange-700 mb-1">개선점</p>
                    <ul className="space-y-1">
                      {answer.feedback.improvements.map((s, i) => (
                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="text-orange-600">→</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {answer.feedback.tip && (
                    <div className="bg-blue-50 rounded p-3">
                      <p className="text-xs font-medium text-blue-700 mb-1">TIP</p>
                      <p className="text-sm text-slate-700">{answer.feedback.tip}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Current question */}
            {questionText && (
              <div className="flex justify-start">
                <div className="max-w-[80%] bg-slate-100 rounded-lg p-4">
                  <p className="text-slate-900">{questionText}</p>
                </div>
              </div>
            )}

            {/* Analyzing state */}
            {isAnalyzing && (
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="text-sm">AI가 답변을 분석하고 있습니다</span>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          {!isAnalyzing && questionText && (
            <div className="border-t border-slate-200 pt-4">
              <textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="답변을 입력하세요..."
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-900"
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={!currentInput.trim()}
                className="mt-3 w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                답변 제출
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Result phase
  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-lg p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">데모 면접 완료!</h1>
            <div className="inline-flex items-center gap-2 mt-4">
              <span className="text-lg text-slate-600">평균 점수:</span>
              <span className={`px-4 py-2 rounded-lg text-2xl font-bold ${
                averageScore >= 8 ? 'bg-green-100 text-green-700' :
                averageScore >= 6 ? 'bg-blue-100 text-blue-700' :
                'bg-orange-100 text-orange-700'
              }`}>
                {averageScore}/10
              </span>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-6">
            <p className="text-slate-700 leading-relaxed">
              이것은 데모 면접입니다. 실제 AI 면접에서는 여러분의 답변에 맞춤화된 질문과 더 상세한 피드백을 받을 수 있습니다.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 mb-3">정식 버전에서 제공되는 기능:</h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <span className="text-blue-600 font-bold">✓</span>
                <span className="text-slate-700">맞춤형 AI 질문과 꼬리질문</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 font-bold">✓</span>
                <span className="text-slate-700">답변별 상세 분석과 모범 답안</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 font-bold">✓</span>
                <span className="text-slate-700">성과 추적 대시보드</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3 pt-4">
            <a
              href="/signup?ref=demo"
              className="block w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium text-center hover:bg-blue-700 transition-colors"
            >
              무료로 시작하기
            </a>
            <button
              onClick={resetDemo}
              className="w-full py-3 px-6 border-2 border-slate-300 text-slate-700 rounded-lg font-medium hover:border-slate-400 transition-colors"
            >
              다시 체험하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
