CREATE MIGRATION m1m6jptzwuer6pw2fbb6mietuh3l5aod7gi4qjqaurbnlwjz6kqigq
    ONTO m1jibugr3qslss5jpixy2jgg7n47jfjmgipegb4qt75mvyuwo7jczq
{
  ALTER TYPE default::Room {
      ALTER PROPERTY createdAt {
          SET REQUIRED USING (<std::datetime>{});
      };
  };
};
