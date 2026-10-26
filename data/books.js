/* 출판사·책 목록 데이터.
   logoW: 로고 표시 너비(px). 굵은 로고는 작게 해서 눈으로 볼 때 크기를 맞춤. 책을 추가하거나 고칠 때는 이 파일만 바꾸면 됩니다.
   image: images/books/ 아래 파일 경로 (없으면 색 표지로 대신 보여줌) */
window.BOOKSHOP = {
  temporary: true, // 사장님 목록을 받으면 false로 바꾸기
  publishers: [
    {
      id: "greatbooks", logo: "images/publishers/greatbooks.png", logoW: 96, name: "그레이트북스", color: "#E5484D", badge: "우수 매장",
      intro: "영아부터 초등까지 단계별 전집. 책바다는 그레이트북스 우수 매장이에요.",
      books: [
        { id: "bebe-mama", title: "베베랑마마랑", age: "0~3세", summary: "아기와 엄마가 함께 보는 첫 책",
          desc: "영아기 아이와 보호자가 함께 읽고 노는 첫 전집이에요.",
          event: "10월 구매 시 놀이동요 애착인형 + 첫걸음 북카트 증정 (1+2 특별혜택)" },
        { id: "amazing-nature", title: "놀라운 자연", age: "유아", summary: "세밀화로 보는 자연 관찰 전집",
          desc: "세밀화로 동식물을 관찰하는 자연 전집이에요.",
          event: "10월 구매 시 가베가족 원목퍼즐 + 어린이 동물도감 증정 (1+2 특별혜택)" }
      ]
    },
    {
      id: "arambooks", logo: "images/publishers/arambooks.png", logoW: 170, name: "아람북스", color: "#2FA8C9", badge: "정품 등록",
      intro: "자연·수학·생활 동화까지 다양한 아람북스 전집을 매장에서 볼 수 있어요.",
      books: [
        { id: "jayeoniol", title: "자연이올", age: "유아", summary: "보드북 10권 + 양장 40권",
          desc: "보드북 10권과 양장 40권으로 구성된 자연 전집이에요. 매장에 입고되어 있어요.",
          event: "10월 구매 시 밸런스 트리 세트(2종) 증정" },
        { id: "math-team", title: "수학특공대", age: "유아", summary: "놀이로 시작하는 수학 전집",
          event: "10월 구매 시 '쪼꼬는 논리짱'(8권) 증정" },
        { id: "hoholand", title: "호호랜드", age: "유아", summary: "생활 습관 동화",
          event: "10월 구매 시 매직펫 시리즈(7권) 증정" },
        { id: "babyall", title: "베이비올 · 플레이올 영어", age: "0~3세", summary: "영아 오감 발달 · 영어 놀이",
          event: "10월 구매 시 오감 자동차, 소리블록, 뮤직통통 중 하나 증정 (1+1)" }
      ]
    },
    {
      id: "froebel", logo: "images/publishers/froebel.png", logoW: 116, name: "프뢰벨", color: "#E8A317", badge: "정품 등록",
      intro: "어린이를 위한 바른 교육, 프뢰벨 전집과 놀이 교구.",
      books: [
        { id: "speaking", title: "말하기 프로그램", age: "유아", summary: "아이 성장 테마 동화 + 양면 놀이책" },
        { id: "first-gift", title: "엄마의 첫 선물", age: "0~3세", summary: "영아 첫 그림책 세트와 퍼즐" },
        { id: "gosari", title: "고사리 삼국지", age: "초등", summary: "고사성어 카드와 함께 읽는 삼국지" }
      ]
    },
    {
      id: "sungwoo", logo: "images/publishers/sungwoo.png", logoW: 150, name: "도서출판 성우", color: "#7C5CC4", badge: "정품 등록",
      intro: "생각하는 힘을 키우는 성우 전집. 묶음 구매 시 소전집을 함께 드려요.",
      books: [
        { id: "kkoma", title: "꼬마 생각 뒤집기", age: "5세 이상", summary: "전 40권 · 애니메이션 40편 · 세이펜",
          image: "images/promo-kkoma.jpg",
          desc: "인공지능 시대의 융합사고력을 키우는 전집이에요. 책 40권과 애니메이션 40편으로 구성되고 세이펜을 쓸 수 있어요.",
          parts: "책 40권, 애니메이션 40편, 세이펜 적용",
          event: "10/31(토)까지 사전예약 특가 396,000원(10% 할인). 꼬마 생각 일력 증정, 영상 1년 연장(총 3년)" },
        { id: "iyagikkot", title: "이야기꽃할망", age: "유아", summary: "옛이야기 전집",
          desc: "옛이야기를 담은 전집이에요. 매장에서 견본을 볼 수 있어요." }
      ]
    },
    {
      id: "kidsschole", logo: "images/publishers/kidsschole.png", logoW: 170, name: "키즈스콜레", color: "#4FB3A9", badge: "정품 등록",
      intro: "첫 지식그림책부터 자연관찰, 역사까지. 키즈스콜레 전집을 매장에서 볼 수 있어요.",
      books: [
        { id: "myfirstworld", title: "마이퍼스트월드", age: "유아", summary: "첫 지식그림책 · 책바다 워크북 증정" },
        { id: "yaho-nature", title: "야호 자연아", age: "유아", summary: "자연관찰 전집 (라이트 버전도 있어요)" },
        { id: "safari", title: "사파리 똑똑 모두누리", age: "유아", summary: "증간 개정판" },
        { id: "first-history", title: "첫 역사그림책 세계사", age: "유아", summary: "그림책으로 시작하는 세계사" },
        { id: "brainpick", title: "브레인픽", age: "유아", summary: "브레인픽 1 · 2" }
      ]
    },
    {
      id: "moongchi", logo: "images/publishers/moongchi.png", logoW: 84, name: "뭉치북스", color: "#3E6FD8", badge: "취급 출판사",
      intro: "토론하며 배우는 초등 과학 전집 〈과학토론왕〉을 만날 수 있어요.",
      books: [
        { id: "science-debate", title: "과학토론왕", age: "초등", summary: "토론으로 배우는 과학 전집" }
      ]
    }
  ],
  more: "키즈에이원도 정품 등록 출판사예요. 구성과 가격은 매장이나 카카오 채널로 문의해 주세요."
};
