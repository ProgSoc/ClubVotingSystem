CREATE MIGRATION m14lz3hna3yp7q6kn4lnrqptqzjeihl3m2utaw6pf7xxs5ecdhanyq
    ONTO m1xaumtx4hxrz22laahpwasqpsd3osxafbz35fs7qcoqojypixsora
{
  ALTER TYPE default::RoomUser {
      CREATE CONSTRAINT std::exclusive ON (.admittedDetails.votingKey);
      DROP PROPERTY location;
      DROP PROPERTY studentEmail;
  };
};
