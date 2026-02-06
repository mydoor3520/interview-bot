import Link from 'next/link';

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-8">환불 정책</h1>
        <p className="text-sm text-zinc-500 mb-12">최종 수정일: 2026년 2월 6일</p>

        <div className="space-y-10 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. 기본 환불 규정</h2>
            <p className="mb-4">전자상거래 등에서의 소비자보호에 관한 법률 제17조에 따라, 구독 후 7일 이내에 청약 철회가 가능합니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 pr-4 text-zinc-200">구분</th>
                    <th className="text-left py-3 text-zinc-200">환불 기준</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  <tr>
                    <td className="py-3 pr-4">7일 이내, 미사용</td>
                    <td className="py-3">전액 환불</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4">7일 이내, 사용</td>
                    <td className="py-3">사용분 차감 후 환불</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4">7일 초과</td>
                    <td className="py-3">환불 불가 (기간 종료까지 서비스 이용 가능)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. 사용분 차감 기준</h2>
            <p className="mb-2">서비스를 이용한 경우, 다음 기준으로 사용분을 차감합니다:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>차감 금액 = (사용 세션 수 / 월간 세션 한도) × 월 구독료</li>
              <li>환불 금액 = 결제 금액 - 차감 금액</li>
              <li>최소 환불 금액: ₩1,000</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. 연간 구독 환불</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>미사용 월에 대해 비례 환불</li>
              <li>연간 할인 혜택분은 환불 금액에서 차감</li>
              <li>환불 금액 = 결제 금액 - (사용 월수 × 월간 정가) - 이미 사용한 세션 차감분</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. 환불 불가 사유</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>구매 후 7일 초과</li>
              <li>서비스 이용약관 위반으로 인한 이용 제한</li>
              <li>환불 후 동일 결제 수단으로 재가입 시 프로모션 혜택 적용 불가</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. 환불 절차</h2>
            <ol className="list-decimal pl-6 space-y-1">
              <li>서비스 내 구독 관리 페이지에서 환불 요청</li>
              <li>환불 사유 및 계산 내역 확인</li>
              <li>결제 수단으로 환불 처리 (영업일 기준 3-5일 소요)</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. 문의</h2>
            <p>환불과 관련된 문의는 <a href="mailto:support@interviewbot.com" className="text-blue-400 hover:text-blue-300">support@interviewbot.com</a>으로 연락주세요.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800">
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">← 홈으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}
