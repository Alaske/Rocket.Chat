import React, { useRef, useMemo } from 'react';
import { Button, ButtonGroup } from '@rocket.chat/fuselage';
import { useMutableCallback } from '@rocket.chat/fuselage-hooks';

import BusinessHoursFormContainer from './BusinessHoursFormContainer';
import Page from '../../components/basic/Page';
import PageSkeleton from '../../components/PageSkeleton';
import { useTranslation } from '../../contexts/TranslationContext';
import { useToastMessageDispatch } from '../../contexts/ToastMessagesContext';
import { useMethod } from '../../contexts/ServerContext';
import { useEndpointDataExperimental, ENDPOINT_STATES } from '../../hooks/useEndpointDataExperimental';

const mapForm = (formData, data) => {
	const { daysOpen, daysTime } = formData;

	return data.workHours?.map((day) => {
		const { day: currentDay, start: { time: start }, finish: { time: finish } } = day;
		const open = daysOpen.includes(currentDay);
		if (daysTime[currentDay]) {
			const { start, finish } = daysTime[currentDay];
			return { day: currentDay, start, finish, open };
		}
		return { day: currentDay, start, finish, open };
	});
};

const EditBusinessHoursPage = ({ id, type }) => {
	const t = useTranslation();
	const dispatchToastMessage = useToastMessageDispatch();

	const { data, state } = useEndpointDataExperimental('livechat/business-hour', useMemo(() => ({ _id: id, type }), [id, type]));

	const saveData = useRef({ form: {} });

	const save = useMethod('livechat:saveBusinessHour');

	const handleSave = useMutableCallback(async () => {
		if (state !== ENDPOINT_STATES.DONE || !data.success) {
			return;
		}

		const { current: {
			form,
			multiple: { departments, ...multiple } = {},
			timezone: { name: timezoneName } = {},
		} } = saveData;

		const mappedForm = mapForm(form, data.businessHour);

		const departmentsToApplyBusinessHour = departments?.join(',') || '';

		try {
			const payload = {
				...data.businessHour,
				...multiple,
				...departmentsToApplyBusinessHour && { departmentsToApplyBusinessHour },
				timezoneName: timezoneName || data.businessHour.timezone.name,
				workHours: mappedForm,
			};

			await save(payload);
			dispatchToastMessage({ type: 'success', message: t('Business_hours_updated') });
		} catch (error) {
			dispatchToastMessage({ type: 'error', message: error });
		}
	});

	if (state === ENDPOINT_STATES.LOADING) {
		return <PageSkeleton />;
	}

	return <Page>
		<Page.Header title={t('Business_Hours')}>
			<ButtonGroup>
				<Button primary onClick={handleSave}>
					{t('Save')}
				</Button>
			</ButtonGroup>
		</Page.Header>
		<Page.ScrollableContentWithShadow>
			<BusinessHoursFormContainer data={data.businessHour} saveRef={saveData}/>
		</Page.ScrollableContentWithShadow>
	</Page>;
};

export default EditBusinessHoursPage;
