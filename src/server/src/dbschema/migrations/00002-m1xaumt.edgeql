CREATE MIGRATION m1xaumtx4hxrz22laahpwasqpsd3osxafbz35fs7qcoqojypixsora
    ONTO m14m3fgvzrx6eeqct3uc4gf7y73etsjj4xu2xltqjfel7zbxaltpua
{
  ALTER TYPE default::RoomUser {
      ALTER LINK room {
          SET REQUIRED USING (<default::Room>{});
      };
  };
  ALTER TYPE default::RoomUser {
      CREATE PROPERTY admittedDetails: tuple<votingKey: std::str, studentEmail: std::str, location: default::UserLocation>;
  };
  ALTER TYPE default::RoomUser {
      DROP PROPERTY votingKey;
  };
};
