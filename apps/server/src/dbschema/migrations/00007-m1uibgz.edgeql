CREATE MIGRATION m1uibgzbaztxsbuyzx4bptzewdrrvr7gdtre5og3ucti3ebuxozjzq
    ONTO m1m6jptzwuer6pw2fbb6mietuh3l5aod7gi4qjqaurbnlwjz6kqigq
{
  ALTER TYPE default::MultiCandidateQuestion {
      DROP LINK candidates;
  };
  DROP TYPE default::SingleVoteQuestion;
  DROP TYPE default::MultiCandidateQuestion;
  ALTER TYPE default::Question {
      CREATE MULTI LINK candidates: default::QuestionCandidate;
      CREATE MULTI LINK interactedUsers: default::RoomUser;
      CREATE REQUIRED PROPERTY closed: std::bool {
          SET REQUIRED USING (<std::bool>{});
      };
      CREATE REQUIRED PROPERTY createdAt: std::datetime {
          SET REQUIRED USING (<std::datetime>{});
          CREATE REWRITE
              INSERT 
              USING (std::datetime_of_statement());
      };
      ALTER PROPERTY question {
          SET REQUIRED USING (<std::str>{});
      };
      ALTER PROPERTY votersPresentAtEnd {
          SET REQUIRED USING (<std::int32>{});
      };
  };
  ALTER TYPE default::QuestionCandidate {
      CREATE LINK singleCandidateVotes := (.<candidate[IS default::SingleCandidateVote]);
  };
  CREATE SCALAR TYPE default::QuestionKind EXTENDING enum<SingleVote>;
};
