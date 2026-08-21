{
  description = "discord-bot dev environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        packages = [ pkgs.nodejs_24 ];

        shellHook = ''
          echo "node $(node --version)"
          exec zsh
        '';
      };
    };
}
