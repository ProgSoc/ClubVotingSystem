CREATE MIGRATION m1boboawrfpmfp3x5yumimtyfohgdlnset73wqbns4p2wwkxnjybja
    ONTO m1uibgzbaztxsbuyzx4bptzewdrrvr7gdtre5og3ucti3ebuxozjzq
{
  ALTER TYPE default::QuestionCandidate {
      ALTER PROPERTY name {
          SET REQUIRED USING (<std::str>{});
      };
  };
  ALTER TYPE default::SingleCandidateVote {
      ALTER LINK candidate {
          SET REQUIRED USING (<default::QuestionCandidate>{});
      };
      ALTER LINK voter {
          SET REQUIRED USING (<default::RoomUser>{});
      };
  };
};
