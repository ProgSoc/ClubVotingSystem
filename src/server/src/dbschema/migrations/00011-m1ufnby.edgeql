CREATE MIGRATION m1ufnbyk34sbzueqpozjbk5rcui3lhnk7zvhf6arfix4pxrz7etytq
    ONTO m1leiwmn6rtjorm4t4e7eudzjkrqopxnfr5s7h42rlqqc6wsotsa3q
{
  ALTER TYPE default::Question {
      ALTER PROPERTY votersPresentAtEnd {
          RESET OPTIONALITY;
      };
  };
};
