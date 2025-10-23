CREATE MIGRATION m1jibugr3qslss5jpixy2jgg7n47jfjmgipegb4qt75mvyuwo7jczq
    ONTO m1u6wzx7kpo5daomvqyy6tgcoqqdijriwj335bm2iq2jblzeiln5gq
{
  ALTER TYPE default::RoomUser {
      ALTER PROPERTY userDetails {
          SET REQUIRED USING (<tuple<studentEmail: std::str, location: default::UserLocation>>{});
      };
  };
};
