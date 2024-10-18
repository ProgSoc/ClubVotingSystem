CREATE MIGRATION m13sjd4vnc4fz2dyrpvvb75tyiixrkiw3aa2tumvxrvlvvc5h4xjqq
    ONTO m1pquqep4tfngyduvkrm64i3z2hj6zscu2zeajung75ixifhtgypeq
{
  CREATE TYPE default::PreferentialCandidateVote {
      CREATE REQUIRED LINK candidate: default::QuestionCandidate;
      CREATE REQUIRED LINK voter: default::RoomUser;
      CREATE REQUIRED PROPERTY rank: std::int32;
      CREATE CONSTRAINT std::exclusive ON ((.candidate, .voter, .rank));
  };
  ALTER TYPE default::QuestionCandidate {
      CREATE LINK preferentialCandidateVotes := (.<candidate[IS default::PreferentialCandidateVote]);
  };
  ALTER SCALAR TYPE default::QuestionFormat EXTENDING enum<SingleVote, PreferentialVote>;
};
