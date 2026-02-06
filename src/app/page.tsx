import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">InterviewBot</Link>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">요금제</Link>
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">로그인</Link>
            <Link href="/signup" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">무료로 시작</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm mb-8">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          AI 기반 면접 준비 플랫폼
        </div>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          면접 준비,
          <br />
          <span className="text-blue-500">AI와 함께</span>
        </h1>
        <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          실전과 같은 AI 모의 면접으로 자신감을 키우세요.
          맞춤형 질문, 즉시 피드백, 상세 분석으로 완벽한 면접을 준비합니다.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
          >
            무료로 시작하기
          </Link>
          <Link
            href="/pricing"
            className="px-8 py-3 border border-zinc-700 text-zinc-300 rounded-lg text-lg font-medium hover:bg-zinc-800 transition-colors"
          >
            요금제 보기
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-3xl font-bold text-center mb-4">왜 InterviewBot인가요?</h2>
        <p className="text-zinc-400 text-center mb-16 max-w-xl mx-auto">
          AI 기술을 활용한 체계적인 면접 준비로 합격률을 높이세요
        </p>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'AI 면접관',
              desc: '실제 면접관처럼 질문하고 꼬리질문으로 깊이를 확인합니다.',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              ),
            },
            {
              title: '맞춤 피드백',
              desc: '답변의 강점과 약점을 분석하고 모범 답안을 제시합니다.',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
            {
              title: '다양한 주제',
              desc: '알고리즘, 시스템 설계, CS 기초부터 행동 면접까지 지원합니다.',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
                </svg>
              ),
            },
            {
              title: '성과 분석',
              desc: '토픽별 성과, 점수 추이, 취약 분야를 한눈에 파악합니다.',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              ),
            },
          ].map((feature, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-zinc-900/50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16">이렇게 시작하세요</h2>
          <div className="grid gap-12 md:grid-cols-3">
            {[
              { step: '01', title: '프로필 설정', desc: '경력, 기술 스택, 지원 포지션을 입력하면 맞춤 질문을 생성합니다.' },
              { step: '02', title: 'AI 면접 시작', desc: '원하는 주제와 난이도를 선택하고 실전처럼 면접을 진행합니다.' },
              { step: '03', title: '피드백 확인', desc: '답변별 점수, 강점/약점 분석, 모범 답안을 확인합니다.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h2 className="text-3xl font-bold mb-4">지금 시작하세요</h2>
        <p className="text-zinc-400 mb-10 max-w-lg mx-auto">
          무료로 시작하고, 면접에 자신감을 더하세요.
        </p>
        <Link
          href="/signup"
          className="inline-flex px-8 py-3 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
        >
          무료로 시작하기
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="text-lg font-bold mb-4">InterviewBot</div>
              <p className="text-sm text-zinc-500">AI 기반 모의 면접 플랫폼</p>
            </div>
            <div>
              <div className="text-sm font-medium mb-4">서비스</div>
              <div className="space-y-2">
                <Link href="/pricing" className="block text-sm text-zinc-400 hover:text-white transition-colors">요금제</Link>
                <Link href="/analytics" className="block text-sm text-zinc-400 hover:text-white transition-colors">분석 대시보드</Link>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-4">법적 고지</div>
              <div className="space-y-2">
                <Link href="/legal/privacy" className="block text-sm text-zinc-400 hover:text-white transition-colors">개인정보처리방침</Link>
                <Link href="/legal/terms" className="block text-sm text-zinc-400 hover:text-white transition-colors">이용약관</Link>
                <Link href="/legal/refund" className="block text-sm text-zinc-400 hover:text-white transition-colors">환불 정책</Link>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-zinc-800 text-center text-sm text-zinc-600">
            &copy; {new Date().getFullYear()} InterviewBot. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
