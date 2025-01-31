import {DADATA_TOKEN} from "config";

const shortLocTypes = ['вл', 'г', 'д', 'двлд', 'днп', 'дор', 'дп', 'жт', 'им', 'к', 'кв', 'км', 'комн', 'кп', 'лпх', 'м',
  'мкр', 'наб', 'нп', 'обл', 'оф', 'п', 'пгт', 'пер', 'пл', 'платф', 'респ', 'рзд', 'рп', 'с', 'сл', 'снт', 'ст', 'стр',
  'тер', 'туп', 'ул', 'х', 'ш'];

export function shortLocType(type) {
  switch (type) {
    case 'поселок городского типа': return 'ПГТ';
    case 'деревня': return 'дер.';
    case 'хутор': return 'хут.';
    case 'поселок': return 'пос.';
    case 'городской поселок': return 'г/п';
    case 'рабочий поселок': return 'р/п';
    case 'дачный поселок': return 'д/п';
    case 'территория днт': return 'т. ДНТ';
    case 'станица': return 'стан.';
    case 'аобл': return 'а/о';
  }

  if (shortLocTypes.indexOf(type) != -1)
    return type + '.';

  return type;
}

// Преобразовывает объект населённого пункта, полученный от DaData, в нормальную структуру.
export function transformDadataSettlement(location, includeRegions = false) {
  const {data} = location;

  let settlement;
  if (data.settlement)
    settlement = `${shortLocType(data.settlement_type_full)} ${data.settlement}`;
  else if (data.city)
    settlement = `${shortLocType(data.city_type)} ${data.city}`;

  const area = data.area ? `${data.area} ${data.area_type}` : null;

  let region;
  if (data.city_with_type != data.region_with_type) {
    const regType = shortLocType(data.region_type);
    if (regType == 'респ.' || regType == 'г.')
      region = `${regType} ${data.region}`;
    else
      region = `${data.region} ${regType}`;
  }

  const main = settlement ? settlement : region;
  let details = region;
  if (area)
    details = `${area}, ${details}`;

  const settlementFias = data.settlement ? data.settlement_fias_id : data.city_fias_id;
  return {
    settlement,
    area,
    region,
    settlementFias,
    regionFias: data.region_fias_id,
    isSettlement: !!data.settlement,

    main,
    details,
    unrestricted: location.unrestricted_value
  };
}

export function transformDadataAddress(location) {
  const {data} = location;
  const street = `${shortLocType(data.street_type)} ${data.street}`;
  const house = data.house;

  let main = street;
  if (house)
    main += `, ${house}`;

  return {
    street,
    house,
    fias: data.fias_id,

    main,
    unrestricted: location.unrestricted_value
  };
}

export async function getLocationByFias(fias) {
  const URL = `https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/address`;

  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Token ${DADATA_TOKEN}`
      },
      body: JSON.stringify({
        query: fias
      })
    });

    const resJson = await res.json();
    const {suggestions} = resJson;
    return transformDadataSettlement(suggestions[0]);

  } catch (e) {
  }
}


//Вычисляет населённый пункт по IP
export async function detectLocation() {
  const URL = `https://suggestions.dadata.ru/suggestions/api/4_1/rs/detectAddressByIp`;

  try {
    const res = await fetch(URL, {
      headers: {
        Accept: "application/json",
        Authorization: `Token ${DADATA_TOKEN}`
      }
    });

    const resJson = await res.json();
    return transformDadataSettlement(resJson.location);

  } catch (e) {
  }
}