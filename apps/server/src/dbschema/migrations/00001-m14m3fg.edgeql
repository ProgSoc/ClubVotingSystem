CREATE MIGRATION m14m3fgvzrx6eeqct3uc4gf7y73etsjj4xu2xltqjfel7zbxaltpua
    ONTO initial
{
  CREATE ABSTRACT TYPE default::Question {
      CREATE PROPERTY question: std::str;
      CREATE PROPERTY votersPresentAtEnd: std::int32;
  };
  CREATE TYPE default::QuestionCandidate {
      CREATE PROPERTY name: std::str;
  };
  CREATE ABSTRACT TYPE default::MultiCandidateQuestion EXTENDING default::Question {
      CREATE MULTI LINK candidates: default::QuestionCandidate;
  };
  CREATE ABSTRACT TYPE default::SingleVoteQuestion EXTENDING default::MultiCandidateQuestion;
  CREATE TYPE default::Room {
      CREATE MULTI LINK questions: default::Question;
      CREATE REQUIRED PROPERTY adminKey: std::str;
      CREATE PROPERTY closedAt: std::datetime;
      CREATE PROPERTY createdAt: std::datetime {
          CREATE REWRITE
              INSERT 
              USING (std::datetime_of_statement());
      };
      CREATE REQUIRED PROPERTY name: std::str;
      CREATE REQUIRED PROPERTY shortId: std::str {
          CREATE CONSTRAINT std::exclusive;
      };
  };
  CREATE SCALAR TYPE default::UserLocation EXTENDING enum<InPerson, Online, Proxy>;
  CREATE SCALAR TYPE default::WaitingState EXTENDING enum<Waiting, Admitted, Declined, Kicked>;
  CREATE TYPE default::RoomUser {
      CREATE LINK room: default::Room;
      CREATE REQUIRED PROPERTY location: default::UserLocation;
      CREATE REQUIRED PROPERTY state: default::WaitingState;
      CREATE REQUIRED PROPERTY studentEmail: std::str;
      CREATE PROPERTY votingKey: std::str;
  };
  CREATE TYPE default::SingleCandidateVote {
      CREATE LINK candidate: default::QuestionCandidate;
      CREATE LINK voter: default::RoomUser;
      CREATE CONSTRAINT std::exclusive ON ((.candidate, .voter));
  };
  ALTER TYPE default::Room {
      CREATE LINK users := (.<room[IS default::RoomUser]);
  };
};
