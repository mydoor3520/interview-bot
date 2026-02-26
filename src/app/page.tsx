'use client';

import Link from 'next/link';
import { useState } from 'react';
import { listJobFunctions, getJobFunction } from '@/lib/job-functions';

export default function LandingPage() {
  const [activeJobTab, setActiveJobTab] = useState('developer');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const jobFunctions = listJobFunctions();
  const activeJob = getJobFunction(activeJobTab);

  const jobExamples: Record<string, string> = {
    developer: 'RESTful API를 설계할 때 고려해야 할 핵심 원칙은 무엇인가요?',
    marketer: '최근 진행한 캠페인에서 가장 큰 성과를 낸 전략은 무엇이었나요?',
    designer: '디자인 시스템을 구축할 때 우선순위를 어떻게 정하시나요?',
    pm: '이해관계자 간 의견이 충돌할 때 어떻게 조율하시나요?',
    general: '업무 중 발생한 갈등 상황을 어떻게 해결한 경험이 있나요?',
  };

  const faqs = [
    {
      q: '정말 무료인가요?',
      a: '네, 현재 베타 기간 동안 모든 기능을 무료로 이용할 수 있습니다. 정식 출시 후에도 기본 기능은 무료로 제공될 예정입니다.',
    },
    {
      q: '어떤 직군을 지원하나요?',
      a: '개발, 마케팅, 디자인, 기획/PM, 일반 등 5개 직군을 지원합니다. 각 직군별로 전문화된 질문과 평가 기준을 제공합니다.',
    },
    {
      q: 'AI 피드백은 정확한가요?',
      a: 'Claude AI를 활용하여 답변의 구조, 논리성, 전문성을 종합적으로 평가합니다. 구체적인 강점/약점과 개선 방향을 제시합니다.',
    },
    {
      q: '기업별 면접 스타일이란?',
      a: '네이버, 카카오, 토스, 쿠팡 등 주요 기업의 실제 면접 패턴과 출제 경향을 반영한 맞춤 면접을 제공합니다.',
    },
    {
      q: '데이터는 안전한가요?',
      a: '모든 데이터는 암호화되어 저장되며, 개인정보처리방침에 따라 엄격하게 관리됩니다. 원하시면 언제든 데이터를 삭제할 수 있습니다.',
    },
    {
      q: '프로필을 꼭 작성해야 하나요?',
      a: '기본 정보(이름, 직군, 경력)만 입력하면 바로 면접을 시작할 수 있습니다. 상세 프로필을 작성하면 더 정확한 맞춤 질문을 받을 수 있습니다.',
    },
    {
      q: '모바일에서도 이용 가능한가요?',
      a: '네, 모바일 브라우저에서 완전히 지원됩니다. PWA를 지원하여 앱처럼 설치해서 사용할 수도 있습니다.',
    },
    {
      q: '베타 이후에는 어떻게 되나요?',
      a: '베타 기간 동안의 데이터는 완전히 보존됩니다. 정식 출시 시 얼리어답터 할인 혜택과 신규 기능 우선 접근권을 제공할 예정입니다.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-8">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            베타 기간 무료 이용 중
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-tight">
            면접 합격률을 높이는
            <br />
            <span className="text-blue-600">AI 면접 코치</span>
          </h1>
          <p className="mt-8 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            실전처럼 연습하고, AI가 즉시 피드백해드려요.
            <br />
            부담 없이, 원하는 만큼, 언제든지.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30"
            >
              무료 체험 시작하기
            </Link>
            <Link
              href="/demo"
              className="w-full sm:w-auto px-8 py-4 border-2 border-slate-300 text-slate-700 rounded-xl text-lg font-semibold hover:border-slate-400 hover:bg-slate-50 transition-all"
            >
              데모 면접 해보기
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Pain Point Section */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-16">
            이런 고민, 해보셨나요?
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                ),
                problem: '면접이 두렵다',
                solution: 'AI와 반복 연습으로 자신감을 키워요',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                ),
                problem: '피드백을 받을 곳이 없다',
                solution: '매 답변마다 AI가 즉시 분석해요',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                  </svg>
                ),
                problem: '어떤 질문이 나올지 모른다',
                solution: '실제 기업 면접 유형 기반 맞춤 질문',
              },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.problem}</h3>
                <p className="text-slate-600 leading-relaxed">{item.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. How It Works */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-16">
            이렇게 시작하세요
          </h2>
          <div className="grid gap-12 md:grid-cols-3">
            {[
              {
                step: '01',
                title: '직군과 주제 선택',
                desc: '개발, 마케팅, 디자인, 기획 등 직군을 선택하면 맞춤 질문이 준비됩니다.',
              },
              {
                step: '02',
                title: 'AI와 실전 면접',
                desc: '실제 면접처럼 AI가 질문하고, 꼬리질문으로 깊이를 확인합니다.',
              },
              {
                step: '03',
                title: '즉시 피드백 확인',
                desc: '답변별 점수, 강점/약점, 구체적 개선 방향을 바로 받아보세요.',
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-blue-600 text-white text-3xl font-bold flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/20">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Feature Benefits */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              왜 InterviewBot인가요?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              단순한 질문 연습이 아닌, 실전 면접 코칭을 경험하세요
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                ),
                title: '실전감 있는 AI 면접관',
                desc: '꼬리질문과 적응형 난이도로 실제 면접처럼 진행됩니다.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                ),
                title: '매 답변 즉시 피드백',
                desc: '기다림 없이 답변 직후 강점, 약점, 개선 방향을 확인하세요.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                  </svg>
                ),
                title: '5개 직군 맞춤 질문',
                desc: '개발, 마케팅, 디자인, 기획, 일반 직군별 전문 질문을 제공합니다.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                  </svg>
                ),
                title: '기업별 면접 스타일',
                desc: '네이버, 카카오, 토스 등 실제 기업의 면접 패턴을 반영합니다.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                ),
                title: '성과 추적 대시보드',
                desc: '점수 추이, 취약 토픽을 한눈에 파악하고 체계적으로 준비하세요.',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                ),
                title: '채용공고 연동',
                desc: '채용공고 URL만 붙여넣으면 맞춤 질문이 자동 생성됩니다.',
              },
            ].map((feature, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Job Function Showcase */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-12">
            어떤 직군이든 맞춤 면접 준비
          </h2>

          {/* Tab Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {jobFunctions.map((job) => (
              <button
                key={job.id}
                onClick={() => setActiveJobTab(job.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeJobTab === job.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {job.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 sm:p-12">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">{activeJob.label} 면접</h3>
            <p className="text-slate-600 mb-8">{activeJob.description}</p>

            {/* Topic Tags */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">주요 토픽</h4>
              <div className="flex flex-wrap gap-2">
                {activeJob.presetTopics[0]?.topics.slice(0, 6).map((topic, i) => (
                  <span
                    key={i}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            {/* Example Question */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
              <h4 className="text-sm font-semibold text-blue-600 mb-2">예시 질문</h4>
              <p className="text-slate-900 text-lg">{jobExamples[activeJob.id]}</p>
            </div>

            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20"
            >
              이 직군으로 면접 시작하기
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Interactive Demo CTA */}
      <section className="bg-blue-50 py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            직접 체험해보세요
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
            가입 없이 3개 질문으로 AI 면접을 미리 경험해보세요.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 px-10 py-5 bg-blue-600 text-white rounded-xl text-lg font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
            데모 면접 시작
          </Link>
        </div>
      </section>

      {/* 7. FAQ Section */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-16">
            자주 묻는 질문
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-100 transition-colors"
                >
                  <span className="text-lg font-semibold text-slate-900 pr-4">{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-slate-600 flex-shrink-0 transition-transform ${
                      openFaqIndex === i ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaqIndex === i && (
                  <div className="px-6 pb-5">
                    <p className="text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Final CTA */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            지금 면접 준비를 시작하세요
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
            무료로 시작하고, 면접에 자신감을 더하세요.
          </p>
          <Link
            href="/signup"
            className="inline-flex px-10 py-5 bg-blue-600 text-white rounded-xl text-lg font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40"
          >
            무료로 시작하기
          </Link>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="text-lg font-bold text-slate-900 mb-2">InterviewBot</div>
              <p className="text-sm text-slate-600">AI 기반 모의 면접 플랫폼</p>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 mb-4">서비스</div>
              <div className="space-y-2">
                <Link href="/pricing" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  요금제
                </Link>
                <Link href="/analytics" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  분석 대시보드
                </Link>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 mb-4">법적 고지</div>
              <div className="space-y-2">
                <Link href="/legal/privacy" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  개인정보처리방침
                </Link>
                <Link href="/legal/terms" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  이용약관
                </Link>
                <Link href="/legal/refund" className="block text-sm text-slate-600 hover:text-slate-900 transition-colors">
                  환불 정책
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
            &copy; {new Date().getFullYear()} InterviewBot. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
