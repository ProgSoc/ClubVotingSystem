CREATE MIGRATION m1u6wzx7kpo5daomvqyy6tgcoqqdijriwj335bm2iq2jblzeiln5gq
    ONTO m14lz3hna3yp7q6kn4lnrqptqzjeihl3m2utaw6pf7xxs5ecdhanyq
{
  ALTER TYPE default::RoomUser {
      DROP CONSTRAINT std::exclusive ON (.admittedDetails.votingKey);
  };
  ALTER TYPE default::RoomUser {
      DROP PROPERTY admittedDetails;
  };
  ALTER TYPE default::RoomUser {
      CREATE PROPERTY userDetails: tuple<studentEmail: std::str, location: default::UserLocation>;
  };
  ALTER TYPE default::RoomUser {
      CREATE PROPERTY votingKey: std::str {
          CREATE CONSTRAINT std::exclusive;
      };
  };
};
