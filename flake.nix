{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    system = "x86_64-linux";

    pkgs = import nixpkgs {
      inherit system;
    };

    src = self;
  in {
    devShells.${system}.default = pkgs.mkShell {
      packages = with pkgs; [
        nodejs
      ];
    };
  };
}
