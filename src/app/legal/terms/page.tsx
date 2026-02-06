import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-8">이용약관</h1>
        <p className="text-sm text-zinc-500 mb-12">최종 수정일: 2026년 2월 6일</p>

        <div className="space-y-10 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">제1조 (목적)</h2>
            <p>본 약관은 InterviewBot(이하 &quot;서비스&quot;)의 이용 조건 및 절차, 이용자와 서비스 제공자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">제2조 (서비스 정의)</h2>
            <p>InterviewBot은 인공지능(AI)을 활용한 모의 면접 시뮬레이션 서비스로, 다음 기능을 제공합니다:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>AI 기반 모의 면접 진행</li>
              <li>면접 답변 평가 및 피드백</li>
              <li>면접 성과 분석 리포트</li>
              <li>맞춤형 면접 질문 생성</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">제3조 (회원 가입 및 자격)</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>만 14세 이상의 개인만 회원 가입이 가능합니다.</li>
              <li>회원은 정확한 정보를 제공해야 하며, 타인의 정보를 도용해서는 안 됩니다.</li>
              <li>서비스는 다음 경우 가입을 거부하거나 이용을 제한할 수 있습니다: 허위 정보 제공, 약관 위반 이력, 법적 제한 대상.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">제4조 (요금 및 결제)</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>서비스는 무료(FREE) 및 유료(PRO) 플랜으로 제공됩니다.</li>
              <li>유료 플랜의 요금은 서비스 내 가격 페이지에 고지됩니다.</li>
              <li>결제는 Stripe를 통해 처리되며, 월간 또는 연간 자동 갱신됩니다.</li>
              <li>자동 갱신을 원하지 않는 경우, 갱신일 전에 구독을 취소해야 합니다.</li>
              <li>모든 금액은 부가가치세(VAT)가 포함된 가격입니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">제5조 (환불 정책)</h2>
            <p className="mb-2">전자상거래 등에서의 소비자보호에 관한 법률에 따라:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>구독 후 7일 이내: 서비스 미사용 시 전액 환불</li>
              <li>구독 후 7일 이내 + 서비스 사용: 사용분 차감 후 환불</li>
              <li>구독 후 7일 초과: 환불 불가 (현재 기간 종료까지 서비스 이용 가능)</li>
              <li>연간 구독: 미사용 월 비례 환불 (연간 할인분 차감)</li>
            </ul>
            <p className="mt-4">환불 요청은 서비스 내 구독 관리 페이지 또는 고객 지원을 통해 가능합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">제6조 (서비스 이용 제한)</h2>
            <p className="mb-2">다음 행위는 금지됩니다:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>서비스의 자동화된 접근 (봇, 크롤러 등)</li>
              <li>서비스 콘텐츠의 무단 복제, 배포, 재판매</li>
              <li>타인의 계정 도용 또는 공유</li>
              <li>서비스 시스템에 대한 해킹 또는 공격 시도</li>
              <li>AI 모델을 악용한 유해 콘텐츠 생성</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">제7조 (면책 조항)</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>AI가 생성한 면접 질문 및 평가는 참고용이며, 실제 면접 결과를 보장하지 않습니다.</li>
              <li>서비스는 AI 답변의 정확성, 완전성을 보장하지 않습니다.</li>
              <li>천재지변, 시스템 장애 등 불가항력에 의한 서비스 중단에 대해 책임지지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">제8조 (분쟁 해결)</h2>
            <p>서비스 이용과 관련된 분쟁은 대한민국 법률에 따르며, 관할 법원은 서울중앙지방법원으로 합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">제9조 (약관 변경)</h2>
            <p>약관 변경 시 시행일 7일 전부터 서비스 내 공지하며, 중대한 변경의 경우 30일 전에 개별 통지합니다. 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800">
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">← 홈으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}
