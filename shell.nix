{ pkgs ? import <nixpkgs> { }, ci ? false }:

with pkgs;
mkShell {
  buildInputs = [
    edgedb
  ];
  shellHook = ''
  '';
}
