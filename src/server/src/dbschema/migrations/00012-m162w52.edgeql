CREATE MIGRATION m162w52lpxbc4bnn3wat2ilmb6z6kxffeqy6gvr6pxg4htk5ievbfa
    ONTO m1ufnbyk34sbzueqpozjbk5rcui3lhnk7zvhf6arfix4pxrz7etytq
{
  ALTER TYPE default::Question {
      ALTER PROPERTY votersPresentAtEnd {
          SET REQUIRED USING (<std::int32>{});
      };
  };
};
