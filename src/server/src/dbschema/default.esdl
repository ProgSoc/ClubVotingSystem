module default {
  type Room {
    required adminKey: str;
    required name: str;

    required shortId: str {
      constraint exclusive;
    }

    required createdAt: datetime {
      rewrite insert using (datetime_of_statement());
    }
    closedAt: datetime;

    link users := .<room[is RoomUser];
    multi questions: Question;
  }

  scalar type UserLocation extending enum<InPerson, Online, Proxy>;
  scalar type WaitingState extending enum<Waiting, Admitted, Declined, Kicked>;
  scalar type QuestionFormat extending enum<SingleVote, PreferentialVote>;

  type RoomUser {
    required state: WaitingState;
    required room: Room;
    required userDetails: tuple<studentEmail: str, location: UserLocation>;

    votingKey: str {
      constraint exclusive;
    }
  }

  type Question {
    required question: str;
    required format: QuestionFormat;

    required closed: bool;
    required createdAt: datetime {
      rewrite insert using (datetime_of_statement());
    }

    required votersPresentAtEnd: int32;
    
    # Max number of elected candidates (default 0)
    required maxElected: int32 {
      default := 0;
    }

    multi interactedUsers: RoomUser;
    multi candidates: QuestionCandidate;
  }

  type SingleCandidateVote {
    required candidate: QuestionCandidate;
    required voter: RoomUser;
    constraint exclusive on ( (.candidate, .voter) );
  }

  type PreferentialCandidateVote {
    required candidate: QuestionCandidate;
    required voter: RoomUser;
    required rank: int32;
    constraint exclusive on ( (.candidate, .voter, .rank) );
  }

  type QuestionCandidate {
    required name: str;

    link singleCandidateVotes := .<candidate[is SingleCandidateVote];
    link preferentialCandidateVotes := .<candidate[is PreferentialCandidateVote];
  }
}
