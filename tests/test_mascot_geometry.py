from pathlib import Path


def test_mascot_js_row_lengths_and_geometry():
    """Verify mascot.js geometry, prop gutters, clean shirt, and lack of legacy code labels."""
    mascot_js = Path(__file__).parent.parent / "omo_terminal" / "web" / "mascot.js"
    assert mascot_js.is_file()

    content = mascot_js.read_text()

    # Verify PROP_EMPTY is 9 spaces
    assert 'const PROP_EMPTY = "         ";' in content

    # Verify clean OMO shirt branding
    assert "OMO" in content
    assert "OMO_BOY" not in content
    assert "var_BOY" not in content
    assert "chmod" not in content

    # Verify kangaroo pouch and oversized hem exist
    assert "+-----------+" in content
    assert "\\___________/" in content

    # Verify human boy facial geometry (ears, temples, separated round frames, cheeks, human smile)
    assert ".---." in content
    assert "\\\\_/     \\\\_/" in content
    assert "\\_______________/" in content
    assert "|<>/" in content
    assert "--|" in content

    # Verify skate sneakers
    assert "(   ${starL}   ) (   ${starR}   )" in content

    # Verify dynamic facial articulation expressions
    assert "(─)" in content  # blink
    assert "(^)" in content  # looking up
    assert "(★)" in content  # star eyes
    assert "(×)" in content  # failure eyes
    assert "(>)" in content  # saccade / glance
    assert "(<)" in content  # saccade / glance
    assert "\\\\___/" in content  # resting smile
    assert " (o) " in content  # talking O
    assert ".-~-." in content  # pursed thinking lips

    # Verify idle flourish sequence triggers
    for flourish in ["adjust_glasses", "head_scratch", "wave", "stretch", "foot_tap"]:
        assert flourish in content

    # Verify action tags handled in state machine
    for tag in ["thinking", "talking", "shell", "reading", "writing", "searching", "success", "failure", "waiting-user"]:
        assert tag in content

