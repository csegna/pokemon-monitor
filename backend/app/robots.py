"""
robots.py
---------
A small courtesy check, not an enforcement mechanism: when a product is
added, look up that domain's robots.txt once and log a warning if the
product's path is disallowed for a generic crawler. This never blocks
anything - it just gives you a visible signal if a retailer's robots.txt
says "please don't automate this," so you can make an informed choice.
"""

import logging
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

logger = logging.getLogger("holo.robots")

_checked_domains: dict[str, RobotFileParser] = {}


def check_courtesy(url: str, user_agent: str = "*") -> None:
    """Log a warning if robots.txt disallows fetching this URL. Best-effort only."""
    parsed = urlparse(url)
    domain = f"{parsed.scheme}://{parsed.netloc}"

    parser = _checked_domains.get(domain)
    if parser is None:
        parser = RobotFileParser()
        parser.set_url(domain + "/robots.txt")
        try:
            parser.read()
        except Exception as error:
            logger.info("Could not read robots.txt for %s: %s", domain, error)
            parser = None
        _checked_domains[domain] = parser

    if parser is not None and not parser.can_fetch(user_agent, url):
        logger.warning(
            "robots.txt for %s disallows fetching %s - CorSe will still check it "
            "since you added it directly, but you may want to review that "
            "retailer's automation policy.",
            domain,
            url,
        )
