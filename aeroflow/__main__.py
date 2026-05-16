"""Entry point: `python -m aeroflow` launches the BTV observation sim."""

from .render.app import run


def main() -> None:
    run()


if __name__ == "__main__":
    main()
