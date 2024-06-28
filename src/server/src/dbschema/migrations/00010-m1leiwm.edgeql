CREATE MIGRATION m1leiwmn6rtjorm4t4e7eudzjkrqopxnfr5s7h42rlqqc6wsotsa3q
    ONTO m1srrjpbns4b5qznp5p5f6bcmou53llzkbyxjxnwwksohw3qksejaq
{
  ALTER SCALAR TYPE default::QuestionKind RENAME TO default::QuestionFormat;
  ALTER TYPE default::Question {
      ALTER PROPERTY kind {
          RENAME TO format;
      };
  };
};
