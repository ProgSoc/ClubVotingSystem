CREATE MIGRATION m1opqdybxvfrnjzsagxfouvpesm72wklvlepxv6l56ubzaqspvg52q
    ONTO m13sjd4vnc4fz2dyrpvvb75tyiixrkiw3aa2tumvxrvlvvc5h4xjqq
{
  ALTER TYPE default::Question {
      CREATE REQUIRED PROPERTY maxElected: std::int32 {
          SET default := 0;
      };
  };
};
