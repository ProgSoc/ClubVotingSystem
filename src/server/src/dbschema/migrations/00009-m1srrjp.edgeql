CREATE MIGRATION m1srrjpbns4b5qznp5p5f6bcmou53llzkbyxjxnwwksohw3qksejaq
    ONTO m1boboawrfpmfp3x5yumimtyfohgdlnset73wqbns4p2wwkxnjybja
{
  ALTER TYPE default::Question {
      CREATE REQUIRED PROPERTY kind: default::QuestionKind {
          SET REQUIRED USING (<default::QuestionKind>{});
      };
  };
};
