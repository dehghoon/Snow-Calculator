from nbcc2020_roof_snow.models.guidance import USER_INPUT_GUIDANCE


def test_four_user_selected_engineering_inputs_have_help_text():
    assert set(USER_INPUT_GUIDANCE) == {"is_factor", "cw", "cb", "h_prime"}
    for metadata in USER_INPUT_GUIDANCE.values():
        assert metadata["help_text"]
        assert metadata["reference"]
