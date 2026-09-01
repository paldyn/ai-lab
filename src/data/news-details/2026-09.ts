import type { NewsDetail } from '../news';

/** 2026-09 발표의 모달 본문. 목록은 news.ts에 있습니다. */
export const details: Record<string, NewsDetail> = {
  'claude-platform-september-1-2026': {
    points: [
      'Claude Fable 5.1(claude-fable-5-1)이 Fable 5의 후속으로 나왔다',
      'Project Glasswing 참가자용 Claude Mythos 5.1도 함께 열렸다',
      '둘 다 1M 토큰 컨텍스트와 128k 최대 출력, 상시 적응형 사고가 기본이다',
      '가격은 100만 토큰당 입력 10달러·출력 50달러로 Fable 5와 같다',
      '캐시 읽기는 100만 토큰당 0.25달러로, 다른 모델의 0.1배가 아닌 입력가의 0.025배다',
      'Claude API와 Bedrock, AWS·Google Cloud·Microsoft Foundry에서 쓸 수 있다',
      '두 모델에서 tool_choice의 any와 tool은 400 오류를 내고 auto·none만 그대로다',
      '두 모델의 출력에는 텍스트 워터마크가 붙고 30일 데이터 보존이 필요하다',
    ],
    commentary:
      '가격표를 그대로 둔 채 세대만 올린 발표다. 실질적인 변화는 캐시 읽기를 입력가의 ' +
      '0.1배에서 0.025배로 내린 쪽인데, 같은 맥락을 되풀이해 읽는 장기 실행 에이전트일수록 ' +
      '청구서가 눈에 띄게 줄어든다. 다만 tool_choice의 any·tool이 막히고 사고 블록을 다시 ' +
      '넣는 조건이 깐깐해져, 옮겨 타는 쪽은 도구 호출부를 손봐야 한다.',
  },
  'enterprise-frontier-safeguards': {
    points: [
      '제로 데이터 보존과 오용 탐지 안전장치를 함께 두는 EFS를 공개했다',
      '데이터는 앤트로픽이 아니라 고객이 통제하는 AWS·Google Cloud·Azure에 쌓인다',
      '암호화 키도 고객이 관리하고 감시 신호는 고객에게 바로 전달된다',
      '검토는 전부 자동이며 앤트로픽 직원이 내용을 보지 않는다',
      'Claude Code·Claude Enterprise·Claude Platform과 Bedrock·Microsoft Foundry 등에서 쓴다',
      '금융·의료·제조·통신·법률·유통·공공 등 100곳 넘는 고객과 함께 설계했다',
      '올가을부터 단계적으로 열고 그 전까지 대상 고객에게는 Fable 5·5.1의 ZDR을 준다',
      '이용료는 없고 저장·읽기·쓰기·이그레스 비용만 클라우드 사업자가 청구한다',
    ],
    commentary:
      '프런티어 모델을 쓰고 싶지만 대화 내용을 벤더에 남길 수 없는 규제 산업이 겨냥이다. ' +
      '오용 탐지를 포기하지 않으면서 보관 주체만 고객으로 옮긴 설계라, 안전장치와 데이터 ' +
      '주권을 맞바꿔야 했던 기존 구도를 흔든다. 다만 감시 신호를 받아 판단하는 부담이 고객 ' +
      '보안팀으로 넘어가므로, 운영 인력이 있는 곳과 없는 곳의 격차는 오히려 벌어질 수 있다.',
  },
  'introducing-agentic-video-in-gemini': {
    points: [
      '모델이 볼 구간과 속도, 방식(프레임·오디오·전사)을 스스로 정하는 처리 방식이다',
      'Gemini 3.7 Flash와 3.6 Flash, 3.5 Flash-Lite에서 쓸 수 있다',
      '토큰 사용은 최대 88%, 비용은 최대 66% 줄고 정확도는 최대 7% 올랐다',
      '오늘부터 Gemini API와 Google AI Studio, Gemini Enterprise Agent Platform에서 쓴다',
      '업로드한 영상과 YouTube 영상이 모두 대상이다',
      '설정에서 처리 방식을 agentic으로 두면 켜지고 기능 자체의 추가 요금은 없다',
      '몇 시간짜리 영상에서 장면 찾기, 이상 탐지, 동작·사물 세기에 쓴다',
      'Gemini 앱에는 곧, YouTube 시청 페이지의 Ask YouTube는 몇 달 안에 들어간다',
    ],
    commentary:
      '영상은 그동안 토큰을 가장 많이 먹는 입력이었고, 그 값이 길이에 비례해 올라가 긴 영상을 ' +
      '다루는 서비스가 서기 어려웠다. 볼 곳을 모델이 고르게 해 비용을 3분의 1 수준으로 낮춘 ' +
      '것은 기능 추가라기보다 가격 구조를 바꾼 쪽에 가깝다. Flash 계열에만 먼저 넣은 것도 ' +
      '건수로 승부하는 대량 처리 수요를 겨냥한 것으로 보인다.',
  },
  'workspace-google-pics': {
    points: [
      '텍스트로 이미지를 만들고 세밀한 조작으로 다듬는 도구다',
      'Nano Banana 이미지 생성·편집 모델을 바탕으로 만들었다',
      '개체를 분리해 바꾸고 이미지 속 글자를 고치거나 번역할 수 있다',
      '여러 사람이 같은 이미지를 함께 편집하고 한 프롬프트로 여러 안을 뽑는다',
      'pics.new에서 단독 제품으로 쓰고 Docs와 Slides에는 바로 들어갔다',
      'Drive 연동은 몇 주 안에 붙는다',
      'Google AI Pro·Ultra 구독자와 대부분의 Workspace 비즈니스 고객에게 몇 주에 걸쳐 열린다',
    ],
    commentary:
      '모델이 아니라 작업하는 자리를 파는 발표다. 같은 Nano Banana를 쓰더라도 Docs·Slides ' +
      '안에서 바로 고칠 수 있으면 편집 도구를 따로 열 이유가 줄고, 그만큼 Workspace 밖으로 ' +
      '나갈 일이 줄어든다. pics.new라는 단독 주소를 함께 연 것은 Workspace 고객이 아닌 ' +
      '사람도 잡겠다는 뜻으로 읽힌다. 값을 따로 매기지 않은 것은 구독을 붙들어 두는 쪽에 ' +
      '쓰겠다는 선택이다.',
  },
};
