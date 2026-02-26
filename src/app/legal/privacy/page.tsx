import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-8">개인정보처리방침</h1>
        <p className="text-sm text-zinc-500 mb-12">최종 수정일: 2026년 2월 14일</p>

        <div className="space-y-10 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. 개인정보 수집 항목</h2>
            <h3 className="font-medium text-zinc-200 mb-2">필수 항목</h3>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li>이메일 주소</li>
              <li>비밀번호 (암호화 저장)</li>
              <li>이름</li>
            </ul>
            <h3 className="font-medium text-zinc-200 mb-2">선택 항목</h3>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li>경력 정보 (회사명, 직무, 기간)</li>
              <li>기술 스택 및 숙련도</li>
              <li>자기소개서 및 이력서 텍스트</li>
              <li>지원 회사/포지션 정보</li>
              <li>유입 경로 (UTM 파라미터)</li>
              <li>AI 데이터 활용 동의 여부</li>
              <li>면접 만족도 평가 (1-5점)</li>
            </ul>
            <h3 className="font-medium text-zinc-200 mb-2">자동 수집 항목</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>IP 주소, 접속 로그</li>
              <li>브라우저 유형, 운영체제</li>
              <li>서비스 이용 기록 (면접 세션, 질문/답변)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. 수집 목적</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>AI 모의 면접 서비스 제공 및 맞춤형 질문 생성</li>
              <li>면접 평가 및 분석 리포트 제공</li>
              <li>결제 처리 및 구독 관리</li>
              <li>서비스 개선을 위한 사용 통계 분석</li>
              <li>고객 지원 및 문의 응대</li>
              <li>법적 의무 이행</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2-1. AI 서비스 개선을 위한 데이터 활용</h2>
            <p className="mb-4">당사는 이용자의 <strong>선택적 동의</strong>를 받아 다음과 같이 데이터를 활용할 수 있습니다:</p>

            <h3 className="font-medium text-zinc-200 mb-2">활용 범위:</h3>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li>면접 질문 및 답변 데이터의 통계적 분석</li>
              <li>AI 면접 질문 품질 개선</li>
              <li>난이도 조정 및 평가 정확도 향상</li>
              <li>주제별/기술별 면접 트렌드 분석</li>
            </ul>

            <h3 className="font-medium text-zinc-200 mb-2">데이터 보호 조치:</h3>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li>모든 데이터는 가명 처리(pseudonymization)하여 분석</li>
              <li>개인 식별이 불가능한 형태로만 활용</li>
              <li>분석 결과는 통계 목적으로만 사용</li>
              <li>제3자에게 개별 데이터 제공 불가</li>
            </ul>

            <h3 className="font-medium text-zinc-200 mb-2">동의 및 철회:</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>회원가입 시 선택적으로 동의할 수 있습니다</li>
              <li>동의하지 않아도 서비스 이용에 제한이 없습니다</li>
              <li>프로필 설정에서 언제든지 동의를 철회할 수 있습니다</li>
              <li>동의 철회 시 이후 데이터는 AI 개선에 활용되지 않습니다</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. 보유 기간</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>회원 정보: 회원 탈퇴 후 30일간 보관 후 영구 삭제</li>
              <li>결제 기록: 5년 (전자상거래법)</li>
              <li>접속 로그: 3개월 (통신비밀보호법)</li>
              <li>면접 세션 데이터: 무료 베타 기간 90일 (추후 변경 가능)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. 제3자 제공</h2>
            <p className="mb-4">당사는 다음 서비스 제공자에게 개인정보를 제공할 수 있습니다:</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-2 pr-4 text-zinc-200">제공 대상</th>
                    <th className="text-left py-2 pr-4 text-zinc-200">목적</th>
                    <th className="text-left py-2 text-zinc-200">국가</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  <tr><td className="py-2 pr-4">Stripe</td><td className="py-2 pr-4">결제 처리</td><td className="py-2">미국</td></tr>
                  <tr><td className="py-2 pr-4">Anthropic</td><td className="py-2 pr-4">AI 면접 서비스</td><td className="py-2">미국</td></tr>
                  <tr><td className="py-2 pr-4">Resend</td><td className="py-2 pr-4">이메일 발송</td><td className="py-2">미국</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. 정보주체의 권리</h2>
            <p className="mb-2">이용자는 언제든지 다음 권리를 행사할 수 있습니다:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>개인정보 열람 요청</li>
              <li>개인정보 정정 요청</li>
              <li>개인정보 삭제 요청</li>
              <li>개인정보 처리 정지 요청</li>
              <li>개인정보 이동 요청 (데이터 내보내기)</li>
            </ul>
            <p className="mt-4">위 권리는 서비스 설정 페이지에서 직접 행사하거나, 아래 연락처로 요청할 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. 개인정보 보호책임자</h2>
            <ul className="list-none space-y-1">
              <li>이메일: privacy@interviewbot.com</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. 개인정보의 안전성 확보 조치</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>비밀번호 bcrypt 암호화 (12 rounds)</li>
              <li>전송 구간 TLS/HTTPS 암호화</li>
              <li>접근 권한 최소화 및 관리</li>
              <li>정기적 보안 점검</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. 쿠키 사용</h2>
            <p>당사는 인증 토큰 저장을 위해 쿠키를 사용합니다. 브라우저 설정에서 쿠키 사용을 거부할 수 있으나, 이 경우 서비스 이용이 제한될 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8-1. 마케팅 및 유입 경로 추적</h2>
            <p className="mb-4">당사는 서비스 개선 및 마케팅 효과 측정을 위해 다음 정보를 수집할 수 있습니다:</p>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li>UTM 파라미터 (utm_source, utm_medium, utm_campaign)</li>
              <li>레퍼럴 코드</li>
              <li>회원가입 경로</li>
            </ul>
            <p>이 정보는 서비스 품질 개선과 이용자 경험 최적화를 위해서만 사용되며, 제3자에게 제공되지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. 개인정보처리방침 변경</h2>
            <p>본 방침이 변경되는 경우 서비스 내 공지 및 이메일을 통해 안내합니다.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800">
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">← 홈으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}
